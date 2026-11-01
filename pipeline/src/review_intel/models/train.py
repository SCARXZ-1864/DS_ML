"""DistilBERT fine-tuning and scoring that runs wherever there is a GPU: a Kaggle notebook,
a Modal container, or (slowly, for tests) the laptop CPU.

Kept free of any one platform's API, so the same code is tested locally and then shipped.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import time
from collections.abc import Callable
from pathlib import Path

import pandas as pd

from review_intel import config
from review_intel.models.distilbert import class_weights


def run_id(train_df: pd.DataFrame, val_df: pd.DataFrame, cfg: dict) -> str:
    """A fingerprint of the data and settings: the same inputs always give the same id."""
    h = hashlib.sha256(json.dumps(cfg, sort_keys=True).encode())
    for df in (train_df, val_df):
        h.update(pd.util.hash_pandas_object(df[["text", "label"]], index=False).values.tobytes())
    return h.hexdigest()[:12]


def fit_sentiment(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    cfg: dict,
    out: Path,
    log: Callable[[str], None] = print,
) -> dict:
    """Fine-tunes the model on the given reviews and keeps the best epoch by validation macro F1.

    Logs one line per epoch (training loss, validation macro F1, elapsed time). The model is saved
    to `out/model` and the run summary to `out/result.json`, which is also returned.
    """
    import numpy as np
    import torch
    from datasets import Dataset
    from sklearn.metrics import f1_score
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        EarlyStoppingCallback,
        Trainer,
        TrainerCallback,
        TrainingArguments,
    )

    start = time.time()
    out = Path(out)
    rid = run_id(train_df, val_df, cfg)
    label_id = {label: i for i, label in enumerate(config.LABELS)}
    device = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    log(f"Training on {len(train_df):,} reviews, validating on {len(val_df):,} · {device}")

    tok = AutoTokenizer.from_pretrained(cfg["model"])

    def to_dataset(df: pd.DataFrame) -> Dataset:
        ds = Dataset.from_dict(
            {"text": df["text"].tolist(), "label": df["label"].map(label_id).tolist()}
        )
        return ds.map(
            lambda b: tok(b["text"], truncation=True, max_length=cfg["max_len"]),
            batched=True,
            remove_columns=["text"],
        )

    train_ds, val_ds = to_dataset(train_df), to_dataset(val_df)
    model = AutoModelForSequenceClassification.from_pretrained(
        cfg["model"],
        num_labels=len(config.LABELS),
        id2label=dict(enumerate(config.LABELS)),
        label2id=label_id,
        ignore_mismatched_sizes=True,  # the base model has no 3-label head yet
    )
    weights = torch.tensor(class_weights(train_df["label"].tolist()), dtype=torch.float)

    class WeightedTrainer(Trainer):
        """Cross-entropy where rare labels (neutral) count for more, as in the baseline."""

        def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None):
            labels = inputs.pop("labels")
            outputs = model(**inputs)
            loss = torch.nn.functional.cross_entropy(
                outputs.logits, labels, weight=weights.to(outputs.logits.device)
            )
            return (loss, outputs) if return_outputs else loss

    def metrics(pred) -> dict:
        return {
            "macro_f1": f1_score(
                pred.label_ids, np.argmax(pred.predictions, axis=1), average="macro"
            )
        }

    class Progress(TrainerCallback):
        """One readable line per epoch."""

        def on_evaluate(self, args, state, control, metrics=None, **kwargs):
            losses = [h["loss"] for h in state.log_history if "loss" in h]
            train_loss = f"{losses[-1]:.3f}" if losses else "n/a"
            log(
                f"epoch {state.epoch:.0f}: train loss {train_loss}"
                f" · val macro F1 {metrics['eval_macro_f1']:.3f}"
                f" · {time.time() - start:,.0f} s"
            )

    class TimeLimit(TrainerCallback):
        """Stops at cfg["timeout_s"], evaluating and saving first, so a slow or stuck run on any
        platform (Kaggle has no limit of its own below ~12 h) ends with a usable model."""

        timed_out = False

        def on_step_end(self, args, state, control, **kwargs):
            if time.time() - start >= cfg["timeout_s"] and not control.should_training_stop:
                TimeLimit.timed_out = True
                control.should_training_stop = True
                control.should_evaluate = True
                control.should_save = True
                log(f"time limit of {cfg['timeout_s']:,} s reached: stopping after this step")

    args = TrainingArguments(
        output_dir=str(out / "checkpoints"),
        num_train_epochs=cfg["epochs"],
        learning_rate=cfg["lr"],
        per_device_train_batch_size=cfg["batch_size"],
        per_device_eval_batch_size=cfg["batch_size"] * 4,
        fp16=cfg["fp16"],
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        logging_steps=200,
        train_sampling_strategy="group_by_length",  # similar lengths together: less padding
        seed=cfg["seed"],
        report_to=[],
        disable_tqdm=True,
    )
    trainer = WeightedTrainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=DataCollatorWithPadding(tok),
        compute_metrics=metrics,
        callbacks=[
            EarlyStoppingCallback(cfg["early_stopping_patience"]),
            Progress(),
            TimeLimit(),
        ],
    )
    trainer.train()
    trainer.save_model(str(out / "model"))
    tok.save_pretrained(str(out / "model"))
    shutil.rmtree(out / "checkpoints", ignore_errors=True)  # the best model is saved; save space

    seconds = time.time() - start
    # One row per evaluation point: a time-limit stop at an epoch's end evaluates twice there.
    by_epoch = {
        h["epoch"]: {
            "epoch": h["epoch"],
            "val_macro_f1": h["eval_macro_f1"],
            "val_loss": h["eval_loss"],
        }
        for h in trainer.state.log_history
        if "eval_macro_f1" in h
    }
    history = list(by_epoch.values())
    result = {
        "run_id": rid,
        "config": cfg,
        "history": history,
        "best_val_macro_f1": max(h["val_macro_f1"] for h in history),
        "seconds": round(seconds),
        "samples_per_s": round(len(train_df) * len(history) / max(seconds, 1), 1),
        "n_train": len(train_df),
        "device": device,
        "timed_out": TimeLimit.timed_out,
    }
    (out / "result.json").write_text(json.dumps(result, indent=2))
    best = result["best_val_macro_f1"]
    log(f"Done in {seconds:,.0f} s · best val macro F1 {best:.3f} · run {rid}")
    return result


def predict_probs(
    model_path: Path, texts: list[str], max_len: int = 256, batch_size: int = 256
) -> list[list[float]]:
    """Label probabilities (config.LABELS order) for each text, on the GPU when there is one."""
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    cuda = torch.cuda.is_available()
    tok = AutoTokenizer.from_pretrained(str(model_path))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_path)).eval()
    if cuda:
        model = model.half().cuda()
    order = sorted(range(len(texts)), key=lambda i: len(texts[i]))  # similar lengths together
    probs: list[list[float] | None] = [None] * len(texts)
    with torch.inference_mode():
        for s in range(0, len(order), batch_size):
            idx = order[s : s + batch_size]
            enc = tok(
                [texts[i] for i in idx],
                truncation=True,
                max_length=max_len,
                padding=True,
                return_tensors="pt",
            ).to(model.device)
            p = torch.softmax(model(**enc).logits.float(), dim=-1).cpu().tolist()
            for i, row in zip(idx, p, strict=True):
                probs[i] = row
    return probs  # type: ignore[return-value]
