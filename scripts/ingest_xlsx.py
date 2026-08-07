"""Parse Excel essays into sentence-aligned structures with error triples."""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

SENTENCE_RE = re.compile(
    r"(?:\\sentence|\\marked|/marked)0*(\d+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}",
    re.DOTALL,
)
# Simpler: capture until matching close brace at depth 1 starting after {
ERROR_RE = re.compile(r"【([^】]*)】")


@dataclass
class ErrorSpan:
    eid: str
    before: str
    type: str
    after: str


@dataclass
class SentenceDraft:
    sid: int
    l2_field: str = ""
    l1_field: str = ""
    marked_raw: str = ""
    errors: list[ErrorSpan] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class EssayDraft:
    essay_id: str
    group: str
    l2_lang: str
    l1_lang: str
    meta: dict[str, Any]
    sentences: list[SentenceDraft] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _group_langs(group: str) -> tuple[str, str]:
    g = (group or "").strip().lower()
    if g == "zh_jp":
        return "ja", "zh"
    if g == "jp_zh":
        return "zh", "ja"
    return "und", "und"


def parse_sentence_blocks(text: str) -> dict[int, str]:
    """Extract \\sentenceNN{...} / \\markedNN{...} / /markedN{...} blocks."""
    if not text:
        return {}
    result: dict[int, str] = {}
    # Manual scan for robustness with nested braces rare; content shouldn't nest {}
    patterns = [
        re.compile(r"\\sentence0*(\d+)\s*\{", re.DOTALL),
        re.compile(r"\\marked0*(\d+)\s*\{", re.DOTALL),
        re.compile(r"/marked0*(\d+)\s*\{", re.DOTALL),
    ]
    for pat in patterns:
        for m in pat.finditer(text):
            sid = int(m.group(1))
            start = m.end()
            depth = 1
            i = start
            while i < len(text) and depth:
                ch = text[i]
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                i += 1
            if depth == 0:
                result[sid] = text[start : i - 1].strip()
    return result


def parse_errors(marked_body: str, sid: int) -> list[ErrorSpan]:
    errors: list[ErrorSpan] = []
    for i, m in enumerate(ERROR_RE.finditer(marked_body or ""), start=1):
        inner = m.group(1)
        parts = inner.split("|")
        if len(parts) < 3:
            # pad incomplete
            while len(parts) < 3:
                parts.append("")
        before, etype, after = parts[0], parts[1], parts[2]
        # allow extra pipes in after by rejoining
        if len(parts) > 3:
            after = "|".join(parts[2:])
        errors.append(
            ErrorSpan(
                eid=f"s{sid}e{i}",
                before=before,
                type=etype.strip(),
                after=after,
            )
        )
    return errors


def strip_error_markup(marked_body: str) -> str:
    """Reconstruct approximate learner surface: keep 修改前, drop markup."""

    def repl(m: re.Match[str]) -> str:
        parts = m.group(1).split("|")
        before = parts[0] if parts else ""
        return "" if before == "∅" else before

    return ERROR_RE.sub(repl, marked_body or "")


def load_essays(xlsx_path: Path) -> list[EssayDraft]:
    wb = load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    col = {name: i for i, name in enumerate(headers)}

    required = [
        "No-essay",
        "group",
        "text_l2-field",
        "text_l1-field",
        "text_l2-marked",
    ]
    for name in required:
        if name not in col:
            raise KeyError(f"Missing column: {name}; got {headers}")

    essays: list[EssayDraft] = []
    for row in rows[1:]:
        if not row or row[col["No-essay"]] is None:
            continue
        essay_id = str(row[col["No-essay"]]).strip()
        group = str(row[col["group"]] or "").strip()
        l2_lang, l1_lang = _group_langs(group)
        meta = {
            "year": row[col["year"]] if "year" in col else None,
            "level": str(row[col["level"]]) if "level" in col and row[col["level"]] is not None else None,
            "notes": str(row[col["notes"]]) if "notes" in col and row[col["notes"]] is not None else None,
            "group": group,
        }

        l2_map = parse_sentence_blocks(str(row[col["text_l2-field"]] or ""))
        l1_map = parse_sentence_blocks(str(row[col["text_l1-field"]] or ""))
        mk_map = parse_sentence_blocks(str(row[col["text_l2-marked"]] or ""))

        sids = sorted(set(l2_map) | set(l1_map) | set(mk_map))
        essay = EssayDraft(
            essay_id=essay_id,
            group=group,
            l2_lang=l2_lang,
            l1_lang=l1_lang,
            meta=meta,
        )
        if set(l2_map.keys()) != set(mk_map.keys()):
            essay.warnings.append(
                f"sid mismatch field_l2={sorted(l2_map)} marked={sorted(mk_map)}"
            )

        for sid in sids:
            draft = SentenceDraft(
                sid=sid,
                l2_field=l2_map.get(sid, ""),
                l1_field=l1_map.get(sid, ""),
                marked_raw=mk_map.get(sid, ""),
            )
            if not draft.l2_field:
                draft.warnings.append("missing l2_field")
            if not draft.marked_raw:
                draft.warnings.append("missing marked")
            draft.errors = parse_errors(draft.marked_raw, sid)
            essay.sentences.append(draft)
        essays.append(essay)
    return essays


def essay_to_dict_pre_tokens(essay: EssayDraft) -> dict[str, Any]:
    return {
        "essay_id": essay.essay_id,
        "group": essay.group,
        "l2_lang": essay.l2_lang,
        "l1_lang": essay.l1_lang,
        "meta": essay.meta,
        "warnings": essay.warnings,
        "sentences": [
            {
                "sid": s.sid,
                "l2_field": s.l2_field,
                "l1_field": s.l1_field,
                "marked_raw": s.marked_raw,
                "learner_approx": strip_error_markup(s.marked_raw),
                "errors": [asdict(e) for e in s.errors],
                "warnings": s.warnings,
            }
            for s in essay.sentences
        ],
    }
