import type { SearchResultItem } from "./search";
import type { SearchIndex } from "./types";

const UTF8_BOM = "\uFEFF";

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map((c) => escapeCsvCell(c == null ? "" : String(c))).join(",");
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatTokens(tokens: { form: string; upos: string }[]): string {
  return tokens.map((t) => `${t.form}/${t.upos}`).join(" ");
}

function formatErrors(
  errors: { before: string; type: string; after: string }[],
): string {
  return errors.map((e) => `【${e.before}|${e.type}|${e.after}】`).join("");
}

/** Build sentence-level corpus CSV (UTF-8 with BOM for Excel). */
export function buildCorpusCsv(index: SearchIndex): string {
  const header = [
    "essay_id",
    "group",
    "l2_lang",
    "year",
    "level",
    "notes",
    "sid",
    "l2_field",
    "l1_field",
    "learner_approx",
    "l2_tokens",
    "errors",
  ];

  const lines = [row(header)];
  for (const s of index.sentences) {
    lines.push(
      row([
        s.essay_id,
        s.group,
        s.l2_lang,
        s.meta.year ?? "",
        s.meta.level ?? "",
        s.meta.notes ?? "",
        s.sid,
        s.l2_field,
        s.l1_field,
        s.learner_approx,
        formatTokens(s.tokens),
        formatErrors(s.errors),
      ]),
    );
  }
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

export function downloadCorpusCsv(
  index: SearchIndex,
  filename = "parallel-learner-corpus.csv",
): void {
  triggerDownload(buildCorpusCsv(index), filename);
}

export interface ResultsExportMeta {
  query: string;
  lang: string;
  usage: string;
  beforeN: number;
  afterN: number;
}

/** Build CSV for current search hits only (UTF-8 with BOM). */
export function buildResultsCsv(
  results: SearchResultItem[],
  meta: ResultsExportMeta,
): string {
  const header = [
    "query",
    "filter_lang",
    "filter_usage",
    "context_before",
    "context_after",
    "channel",
    "essay_id",
    "group",
    "l2_lang",
    "year",
    "level",
    "notes",
    "sid",
    "l2_field",
    "l1_field",
    "learner_approx",
    "hit_token_ids",
    "hit_forms",
    "matched_errors",
    "context_before_text",
    "context_after_text",
    "l2_tokens",
    "errors",
  ];

  const lines = [row(header)];
  for (const item of results) {
    const s = item.sentence;
    const hitTid = new Set(item.hit.token_ids);
    const hitForms = s.tokens
      .filter((tok) => hitTid.has(tok.tid))
      .map((tok) => tok.form)
      .join(" ");
    const matchedErrors = s.errors
      .filter((e) => item.hit.error_ids.includes(e.eid))
      .map((e) => `【${e.before}|${e.type}|${e.after}】`)
      .join("");

    lines.push(
      row([
        meta.query,
        meta.lang,
        meta.usage,
        meta.beforeN,
        meta.afterN,
        item.hit.channel,
        s.essay_id,
        s.group,
        s.l2_lang,
        s.meta.year ?? "",
        s.meta.level ?? "",
        s.meta.notes ?? "",
        s.sid,
        s.l2_field,
        s.l1_field,
        s.learner_approx,
        item.hit.token_ids.join(" "),
        hitForms,
        matchedErrors,
        item.contextBefore.map((c) => c.l2_field).join(" | "),
        item.contextAfter.map((c) => c.l2_field).join(" | "),
        formatTokens(s.tokens),
        formatErrors(s.errors),
      ]),
    );
  }
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

export function downloadResultsCsv(
  results: SearchResultItem[],
  meta: ResultsExportMeta,
  filename = "search-results.csv",
): void {
  triggerDownload(buildResultsCsv(results, meta), filename);
}
