#!/usr/bin/env python3
"""Merge sentence-level marked-sentence-final into article-level text_l2-marked."""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
SENT_ID_RE = re.compile(r"-0*(\d+)$")
SENTENCE_BLOCK_RE = re.compile(r"\\sentence0*(\d+)\s*\{")
MARKED_BLOCK_RE = re.compile(r"(?:\\marked|/marked)0*(\d+)\s*\{")
ERROR_RE = re.compile(r"【([^】]*)】")


def _sid_from_no_sentence(value: str) -> int | None:
    m = SENT_ID_RE.search((value or "").strip())
    return int(m.group(1)) if m else None


def _block_sids(text: str, pattern: re.Pattern[str]) -> list[int]:
    return [int(x) for x in pattern.findall(text or "")]


def load_sentence_marked(path: Path) -> dict[str, dict[int, str]]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return {}
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    col = {name: i for i, name in enumerate(headers)}
    for required in ("No-essay", "No-sentence", "marked-sentence-final"):
        if required not in col:
            raise KeyError(f"{path.name}: missing column {required}; got {headers}")

    by_essay: dict[str, dict[int, str]] = defaultdict(dict)
    for row in rows[1:]:
        if not row or row[col["No-essay"]] is None:
            continue
        essay_id = str(row[col["No-essay"]]).strip()
        sid = _sid_from_no_sentence(str(row[col["No-sentence"]] or ""))
        if sid is None:
            raise ValueError(f"{path.name}: cannot parse sid from {row[col['No-sentence']]!r}")
        body = "" if row[col["marked-sentence-final"]] is None else str(row[col["marked-sentence-final"]]).strip()
        if sid in by_essay[essay_id]:
            raise ValueError(f"{path.name}: duplicate sid {sid} for {essay_id}")
        by_essay[essay_id][sid] = body
    return dict(by_essay)


def compose_marked(sents: dict[int, str]) -> str:
    lines = [f"\\marked{sid:02d}{{{sents[sid]}}}" for sid in sorted(sents)]
    return "\n".join(lines)


def count_error_spans(text: str) -> int:
    return len(ERROR_RE.findall(text or ""))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cn",
        type=Path,
        default=ROOT / "corpus-data" / "260807-CN-essay-text_l2.xlsx",
    )
    parser.add_argument(
        "--jp",
        type=Path,
        default=ROOT / "corpus-data" / "260807-JP-essay-text_l2.xlsx",
    )
    parser.add_argument(
        "--article",
        type=Path,
        default=ROOT / "corpus-data" / "260807-CN&JP-essay-by-article.xlsx",
    )
    args = parser.parse_args()

    cn_map = load_sentence_marked(args.cn)
    jp_map = load_sentence_marked(args.jp)
    overlap = set(cn_map) & set(jp_map)
    if overlap:
        raise SystemExit(f"CN/JP sentence files share essay IDs: {sorted(overlap)[:10]}")
    sent_map = {**cn_map, **jp_map}
    sent_span_total = sum(count_error_spans(body) for sents in sent_map.values() for body in sents.values())

    wb = load_workbook(args.article)
    ws = wb.active
    headers = [str(c.value).strip() if c.value is not None else "" for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {name: i + 1 for i, name in enumerate(headers)}
    for required in ("No-essay", "text_l2-field"):
        if required not in col:
            raise SystemExit(f"article sheet missing {required}; got {headers}")

    if "text_l2-marked" in col:
        marked_col = col["text_l2-marked"]
    else:
        marked_col = ws.max_column + 1
        ws.cell(1, marked_col, "text_l2-marked")

    article_ids: list[str] = []
    mismatches: list[str] = []
    missing_marked: list[str] = []
    empty_marked: list[str] = []
    article_span_total = 0

    for row_idx in range(2, ws.max_row + 1):
        raw_id = ws.cell(row_idx, col["No-essay"]).value
        if raw_id is None:
            continue
        essay_id = str(raw_id).strip()
        article_ids.append(essay_id)
        field = str(ws.cell(row_idx, col["text_l2-field"]).value or "")
        field_sids = _block_sids(field, SENTENCE_BLOCK_RE)
        sents = sent_map.get(essay_id)
        if not sents:
            missing_marked.append(essay_id)
            continue
        marked_sids = sorted(sents)
        if marked_sids != sorted(field_sids):
            mismatches.append(
                f"{essay_id}: field={sorted(field_sids)} marked={marked_sids}"
            )
            continue
        composed = compose_marked(sents)
        if not composed.strip():
            empty_marked.append(essay_id)
        ws.cell(row_idx, marked_col, composed)
        article_span_total += count_error_spans(composed)

    article_set = set(article_ids)
    sent_set = set(sent_map)
    only_article = sorted(article_set - sent_set)
    only_sentence = sorted(sent_set - article_set)

    print(f"CN essays: {len(cn_map)}  JP essays: {len(jp_map)}")
    print(f"Article essays: {len(article_ids)} unique={len(article_set)}")
    print(f"Sentence essays: {len(sent_set)}")
    print(f"Error spans (sentence files): {sent_span_total}")
    print(f"Error spans (composed column): {article_span_total}")

    errors: list[str] = []
    if only_article:
        errors.append(f"only in article: {only_article[:20]} (n={len(only_article)})")
    if only_sentence:
        errors.append(f"only in sentence files: {only_sentence[:20]} (n={len(only_sentence)})")
    if missing_marked:
        errors.append(f"missing marked: {missing_marked[:20]} (n={len(missing_marked)})")
    if empty_marked:
        errors.append(f"empty marked: {empty_marked[:20]} (n={len(empty_marked)})")
    if mismatches:
        errors.append("sid mismatch:\n  " + "\n  ".join(mismatches[:10]))
    if sent_span_total != article_span_total:
        errors.append(f"span count mismatch: sentence={sent_span_total} article={article_span_total}")

    # spot checks after write-to-memory
    spot = {}
    for row_idx in range(2, ws.max_row + 1):
        eid = ws.cell(row_idx, col["No-essay"]).value
        if eid is None:
            continue
        eid = str(eid).strip()
        if eid in {"CJL001", "JLCW_001"}:
            spot[eid] = str(ws.cell(row_idx, marked_col).value or "")

    if "【趣味|wrong-content-word|興味】" not in spot.get("CJL001", ""):
        errors.append("spot check failed: CJL001 missing 【趣味|wrong-content-word|興味】")
    else:
        print("spot check OK: CJL001 趣味→興味")
    if "【分野|wrong-content-word|方向】" not in spot.get("JLCW_001", ""):
        errors.append("spot check failed: JLCW_001 missing 【分野|wrong-content-word|方向】")
    else:
        print("spot check OK: JLCW_001 分野→方向")

    if errors:
        print("VERIFICATION FAILED:", file=sys.stderr)
        for e in errors:
            print(" -", e, file=sys.stderr)
        raise SystemExit(1)

    args.article.parent.mkdir(parents=True, exist_ok=True)
    wb.save(args.article)
    print(f"Wrote text_l2-marked -> {args.article}")
    print("VERIFICATION PASSED")


if __name__ == "__main__":
    main()
