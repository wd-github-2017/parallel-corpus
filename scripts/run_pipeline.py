#!/usr/bin/env python3
"""Run full corpus pipeline: Excel -> canonical JSON -> search-index.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from annotate_tokens import annotate_essay  # noqa: E402
from build_index import build_index, write_index  # noqa: E402
from ingest_xlsx import essay_to_dict_pre_tokens, load_essays  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--xlsx",
        type=Path,
        default=ROOT / "corpus-data" / "260807-CN&JP-essay-by-article.xlsx",
    )
    parser.add_argument(
        "--canonical-dir",
        type=Path,
        default=ROOT / "data" / "canonical",
    )
    parser.add_argument(
        "--index-out",
        type=Path,
        default=ROOT / "data" / "search-index.json",
    )
    parser.add_argument(
        "--web-public",
        type=Path,
        default=ROOT / "web" / "public" / "search-index.json",
        help="Also copy index into Vite public/ for the demo app",
    )
    args = parser.parse_args()

    essays_draft = load_essays(args.xlsx)
    print(f"Loaded {len(essays_draft)} essays from {args.xlsx}")

    args.canonical_dir.mkdir(parents=True, exist_ok=True)
    annotated: list[dict] = []
    for draft in essays_draft:
        pre = essay_to_dict_pre_tokens(draft)
        essay = annotate_essay(pre)
        annotated.append(essay)
        out = args.canonical_dir / f"{essay['essay_id']}.json"
        out.write_text(json.dumps(essay, ensure_ascii=False, indent=2), encoding="utf-8")
        n_tok = sum(len(s["l2_tokens"]) for s in essay["sentences"])
        n_err = sum(len(s["errors"]) for s in essay["sentences"])
        print(
            f"  {essay['essay_id']}: {len(essay['sentences'])} sents, "
            f"{n_tok} l2 tokens, {n_err} errors, lang={essay['l2_lang']}"
        )
        for w in essay.get("warnings") or []:
            print(f"    warning: {w}")

    index = build_index(annotated)
    write_index(index, args.index_out)
    print(f"Wrote index: {args.index_out} ({index['sentence_count']} sentences)")

    if args.web_public:
        args.web_public.parent.mkdir(parents=True, exist_ok=True)
        write_index(index, args.web_public)
        print(f"Copied index -> {args.web_public}")


if __name__ == "__main__":
    main()
