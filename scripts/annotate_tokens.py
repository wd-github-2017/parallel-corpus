"""Tokenize text_l2-field / text_l1-field only; align error.after to l2 tokens."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from pos_map import jieba_to_upos, sudachi_to_upos


@dataclass
class Token:
    tid: int
    form: str
    upos: str
    char_start: int
    char_end: int
    xpos: str = "_"


@lru_cache(maxsize=1)
def _sudachi():
    from sudachipy import Dictionary, tokenizer

    dict_ = Dictionary(dict="core")
    return dict_.create(mode=tokenizer.Tokenizer.SplitMode.A)


def tokenize_ja(text: str) -> list[Token]:
    if not text:
        return []
    tok = _sudachi()
    tokens: list[Token] = []
    tid = 1
    for m in tok.tokenize(text):
        form = m.surface()
        if form == "":
            continue
        # sudachi morph provides begin/end via raw span in recent APIs
        try:
            start = m.begin()
            end = m.end()
        except Exception:
            # fallback: sequential search
            start = text.find(form) if tid == 1 else text.find(form, tokens[-1].char_end)
            if start < 0:
                start = tokens[-1].char_end if tokens else 0
            end = start + len(form)
        pos = m.part_of_speech()
        pos0 = pos[0] if pos else ""
        pos1 = pos[1] if len(pos) > 1 else ""
        tokens.append(
            Token(
                tid=tid,
                form=form,
                upos=sudachi_to_upos(pos0, pos1),
                char_start=start,
                char_end=end,
                xpos=",".join(pos[:4]) if pos else "_",
            )
        )
        tid += 1
    return tokens


def tokenize_zh(text: str) -> list[Token]:
    if not text:
        return []
    import jieba.posseg as pseg

    tokens: list[Token] = []
    tid = 1
    cursor = 0
    for word, flag in pseg.cut(text):
        if word == "":
            continue
        # locate in text from cursor (jieba may normalize spaces rarely)
        idx = text.find(word, cursor)
        if idx < 0:
            idx = cursor
            end = cursor + len(word)
        else:
            end = idx + len(word)
        tokens.append(
            Token(
                tid=tid,
                form=word,
                upos=jieba_to_upos(flag),
                char_start=idx,
                char_end=end,
                xpos=flag or "_",
            )
        )
        cursor = end
        tid += 1
    return tokens


def tokenize(text: str, lang: str) -> list[Token]:
    if lang == "ja":
        return tokenize_ja(text)
    if lang == "zh":
        return tokenize_zh(text)
    # fallback: character clusters
    return tokenize_zh(text)


def align_after_to_tokens(
    field_text: str, after: str, tokens: list[Token]
) -> list[int]:
    """Map error.after substring onto covering token ids in l2_field."""
    if not after or after == "∅" or not field_text or not tokens:
        return []
    start = field_text.find(after)
    if start < 0:
        # soft normalize fullwidth punctuation variants
        soft = (
            after.replace("，", ",")
            .replace("。", ".")
            .replace("、", "､")
            .replace(" ", "")
        )
        compact = field_text.replace(" ", "")
        # try simple space-insensitive search on original
        start = field_text.find(after.strip())
        if start < 0:
            return []
    end = start + len(after)
    ids: list[int] = []
    for t in tokens:
        # overlap
        if t.char_start < end and t.char_end > start:
            ids.append(t.tid)
    return ids


def annotate_essay(essay: dict[str, Any]) -> dict[str, Any]:
    l2_lang = essay["l2_lang"]
    l1_lang = essay["l1_lang"]
    out_sentences = []
    for s in essay["sentences"]:
        l2_tokens = [t.__dict__ for t in tokenize(s["l2_field"], l2_lang)]
        l1_tokens = [t.__dict__ for t in tokenize(s["l1_field"], l1_lang)]
        token_objs = [Token(**t) for t in l2_tokens]
        errors_out = []
        for e in s["errors"]:
            after_ids = align_after_to_tokens(s["l2_field"], e["after"], token_objs)
            errors_out.append(
                {
                    **e,
                    "after_token_ids": after_ids,
                    "before_tokens": [
                        t.__dict__
                        for t in tokenize(
                            "" if e["before"] == "∅" else e["before"], l2_lang
                        )
                    ],
                }
            )
        out_sentences.append(
            {
                "sid": s["sid"],
                "l2_field": s["l2_field"],
                "l1_field": s["l1_field"],
                "marked_raw": s["marked_raw"],
                "learner_approx": s.get("learner_approx", ""),
                "l2_tokens": l2_tokens,
                "l1_tokens": l1_tokens,
                "errors": errors_out,
                "warnings": s.get("warnings", []),
            }
        )
    return {
        "essay_id": essay["essay_id"],
        "group": essay["group"],
        "l2_lang": essay["l2_lang"],
        "l1_lang": essay["l1_lang"],
        "meta": essay["meta"],
        "warnings": essay.get("warnings", []),
        "sentences": out_sentences,
    }
