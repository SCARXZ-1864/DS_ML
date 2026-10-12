"""Modal deployment of the inference service (replaces the HF Docker Space; ERROR_LOG 2026-10-12).

Deploy (from inference/):   uv run --group deploy modal deploy modal_app.py
Local cloud dev server:     uv run --group deploy modal serve modal_app.py

Requires a Modal secret named "review-intel-inference" containing INFERENCE_API_KEY,
created by the owner in the Modal dashboard (Secrets → Custom).
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import modal

HERE = Path(__file__).resolve().parent


def _git_sha() -> str:
    try:
        cmd = ["git", "rev-parse", "--short", "HEAD"]
        out = subprocess.run(cmd, capture_output=True, text=True, cwd=HERE)
        return out.stdout.strip() or "unknown"
    except OSError:
        return "unknown"


image = (
    modal.Image.debian_slim(python_version="3.12")
    # Same pyproject + uv.lock as local and CI, so production runs the exact locked versions.
    .uv_sync(uv_project_dir=str(HERE), frozen=True)
    .env({"GIT_SHA": _git_sha()})
    .add_local_python_source("app")
)

app = modal.App("review-intel-inference", image=image)


@app.function(
    secrets=[modal.Secret.from_name("review-intel-inference")],
    cpu=1.0,
    memory=2048,  # revisit in M8 once models are loaded (RISKS R11)
    # Idle containers stop after 5 min. Longer means fewer cold starts but more
    # credits; at portfolio traffic this costs cents per month (PLAN §6).
    scaledown_window=300,
    min_containers=0,
    timeout=60,
)
@modal.concurrent(max_inputs=8)
@modal.asgi_app(label="review-intel-inference")
def web():
    from app.main import create_app  # the `app` package, not the Modal App above

    return create_app()
