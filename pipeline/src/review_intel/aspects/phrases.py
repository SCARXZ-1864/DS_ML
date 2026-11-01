"""Candidate aspect phrases: the things a review talks about, with exact character offsets.

"The biryani was great but we waited 50 minutes" → "biryani", "minute". Offsets point back into
the original text, so anything shown later (a cause, a highlight) is always the customer's own
words, never a paraphrase.
"""

from __future__ import annotations

from typing import TypedDict

# Nouns too vague to be an aspect on their own. "wait time" survives (it's a compound); "time"
# alone doesn't.
_VAGUE = """
thing stuff lot bit way day time one everything something anything nothing place product item
star review experience everyone people guy anyone someone kind sort part year week month order
best lack none win easy total plenty bunch ton fine worth
"""
STOPLIST = frozenset(_VAGUE.split())
# Never aspects, even inside a longer phrase ("Friday night"): people, times and the shop itself.
# Found in notebook 04's first catalogue, which had "Friend", "Wife", "Night" and "Restaurant".
_NOT_ASPECTS = """
friend wife husband hubby boyfriend girlfriend family kid child son daughter mom dad mother father
guest group party couple person man woman lady gentleman buddy date
night evening morning afternoon today tonight yesterday weekend monday tuesday wednesday thursday
friday saturday sunday hour moment visit trip
restaurant store shop business establishment amazon seller company location
"""
NOT_ASPECTS = frozenset(_NOT_ASPECTS.split())
MAX_TOKENS = 3
NOUNS = ("NOUN", "PROPN")
MODIFIER_DEPS = ("compound", "amod")


def _modifies_next_noun(tok) -> bool:
    """A noun that only modifies the noun after it ("wait" in "wait time") isn't a phrase itself."""
    return tok.dep_ in MODIFIER_DEPS and tok.head.pos_ in NOUNS and tok.head.i > tok.i


class Phrase(TypedDict):
    review_id: str
    sentence: str
    sent_start: int  # character offset of the sentence in the review
    text: str  # normalised: lowercase lemmas, e.g. "fries" → "fry"
    start: int  # character offsets of the phrase in the review
    end: int


def extract_phrases(review_id: str, text: str, nlp) -> list[Phrase]:
    """Every noun (with the nouns directly in front of it, as in "customer service") in the review.

    `nlp` is a loaded spaCy pipeline (en_core_web_sm), passed in so it loads once, not per review.
    """
    doc = nlp(text)
    out: list[Phrase] = []
    for sent in doc.sents:
        for tok in sent:
            if tok.pos_ not in NOUNS or _modifies_next_noun(tok):
                continue
            # Nouns directly to the left that modify this one belong to it: "wait" + "time". Decided
            # by part of speech, because the small model sometimes labels "wait" as an adjective
            # modifier (amod) instead of a compound.
            left = [c for c in tok.lefts if c.pos_ in NOUNS and c.dep_ in MODIFIER_DEPS]
            tokens = [*left, tok][-MAX_TOKENS:]
            if tokens != list(doc[tokens[0].i : tok.i + 1]):
                tokens = [
                    tok
                ]  # something sits between them ("waiter's lovely smile"); keep the noun
            norm = " ".join(t.lemma_.lower() for t in tokens)
            if len(tokens) == 1 and norm in STOPLIST:
                continue
            if tok.lemma_.lower() in NOT_ASPECTS:
                continue
            if not norm.replace(" ", "").isalpha():
                continue
            out.append(
                {
                    "review_id": review_id,
                    "sentence": sent.text,
                    "sent_start": sent.start_char,
                    "text": norm,
                    "start": tokens[0].idx,
                    "end": tok.idx + len(tok.text),
                }
            )
    return out
