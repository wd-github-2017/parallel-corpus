"""Build client-side search index from canonical essays."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def build_index(essays: list[dict[str, Any]]) -> dict[str, Any]:
    sentences: list[dict[str, Any]] = []
    form_postings: dict[str, list[dict[str, int | str]]] = {}
    error_before_postings: dict[str, list[dict[str, str]]] = {}

    for essay in essays:
        essay_id = essay["essay_id"]
        l2_lang = essay["l2_lang"]
        sents = essay["sentences"]
        by_sid = {s["sid"]: s for s in sents}
        ordered_sids = sorted(by_sid)

        for s in sents:
            sid = s["sid"]
            idx = len(sentences)
            correction_tids = set()
            for e in s["errors"]:
                for tid in e.get("after_token_ids") or []:
                    correction_tids.add(tid)

            tokens = []
            for t in s["l2_tokens"]:
                is_corr = t["tid"] in correction_tids
                tokens.append(
                    {
                        "tid": t["tid"],
                        "form": t["form"],
                        "upos": t["upos"],
                        "char_start": t["char_start"],
                        "char_end": t["char_end"],
                        "is_correction_site": is_corr,
                    }
                )
                form_postings.setdefault(t["form"], []).append(
                    {
                        "essay_id": essay_id,
                        "sid": sid,
                        "tid": t["tid"],
                        "sent_idx": idx,
                    }
                )

            errors = []
            for e in s["errors"]:
                errors.append(
                    {
                        "eid": e["eid"],
                        "before": e["before"],
                        "type": e["type"],
                        "after": e["after"],
                        "after_token_ids": e.get("after_token_ids") or [],
                        "before_tokens": [
                            {"form": bt["form"], "upos": bt["upos"]}
                            for bt in e.get("before_tokens") or []
                        ],
                    }
                )
                before = e["before"]
                if before and before != "∅":
                    forms = {before}
                    for bt in e.get("before_tokens") or []:
                        if bt.get("form"):
                            forms.add(bt["form"])
                    posting = {
                        "essay_id": essay_id,
                        "sid": sid,
                        "eid": e["eid"],
                        "sent_idx": idx,
                    }
                    for form in forms:
                        bucket = error_before_postings.setdefault(form, [])
                        if posting not in bucket:
                            bucket.append(posting)

            # context helpers: neighbor sids
            pos = ordered_sids.index(sid)
            sentences.append(
                {
                    "sent_idx": idx,
                    "essay_id": essay_id,
                    "sid": sid,
                    "l2_lang": l2_lang,
                    "group": essay["group"],
                    "l2_field": s["l2_field"],
                    "l1_field": s["l1_field"],
                    "learner_approx": s.get("learner_approx", ""),
                    "tokens": tokens,
                    "errors": errors,
                    "prev_sids": ordered_sids[:pos],
                    "next_sids": ordered_sids[pos + 1 :],
                    "meta": essay["meta"],
                }
            )

    return {
        "version": 1,
        "sentence_count": len(sentences),
        "essay_count": len(essays),
        "sentences": sentences,
        "form_postings": form_postings,
        "error_before_postings": error_before_postings,
    }


def write_index(index: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
