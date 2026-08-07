import { parseQuery } from "./queryParse";
import type {
  IndexError,
  IndexSentence,
  IndexToken,
  LangFilter,
  MatchHit,
  ParsedQuery,
  QuerySlot,
  SearchIndex,
  UsageFilter,
} from "./types";

const DEFAULT_GAP = 2;

function tokenMatches(slot: QuerySlot, token: { form: string; upos: string }): boolean {
  if (slot.kind === "form") return token.form === slot.value;
  return token.upos === slot.value;
}

/** Ordered sequence match with max gap between consecutive slots. */
function findSequence(
  tokens: { form: string; upos: string; tid?: number }[],
  slots: QuerySlot[],
  maxGap: number,
): number[][] {
  if (!slots.length || !tokens.length) return [];
  const hits: number[][] = [];

  function dfs(slotIdx: number, prevTokIdx: number, path: number[]) {
    if (slotIdx >= slots.length) {
      hits.push([...path]);
      return;
    }
    const slot = slots[slotIdx];
    const from = prevTokIdx + 1;
    const to = Math.min(tokens.length - 1, prevTokIdx + 1 + maxGap);
    for (let i = from; i <= to; i++) {
      if (!tokenMatches(slot, tokens[i])) continue;
      path.push(tokens[i].tid ?? i + 1);
      dfs(slotIdx + 1, i, path);
      path.pop();
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    if (!tokenMatches(slots[0], tokens[i])) continue;
    if (slots.length === 1) {
      hits.push([tokens[i].tid ?? i + 1]);
      continue;
    }
    dfs(1, i, [tokens[i].tid ?? i + 1]);
  }
  return hits;
}

function expandContiguousForm(
  sentence: IndexSentence,
  form: string,
): QuerySlot[] | null {
  // If exact token exists, keep single form
  if (sentence.tokens.some((t) => t.form === form)) {
    return [{ kind: "form", value: form }];
  }
  // Substring in surface -> covering tokens
  const idx = sentence.l2_field.indexOf(form);
  if (idx < 0) return null;
  const end = idx + form.length;
  const covering = sentence.tokens.filter(
    (t) => t.char_start < end && t.char_end > idx,
  );
  if (!covering.length) return null;
  return covering.map((t) => ({ kind: "form" as const, value: t.form }));
}

function matchFieldSentence(
  sentence: IndexSentence,
  query: ParsedQuery,
  maxGap: number,
): number[][] {
  if (!query.slots.length) return [];

  // Single contiguous form may span multiple tokens
  if (query.slots.length === 1 && query.slots[0].kind === "form") {
    const expanded = expandContiguousForm(sentence, query.slots[0].value);
    if (!expanded) return [];
    return findSequence(sentence.tokens, expanded, maxGap);
  }

  return findSequence(sentence.tokens, query.slots, maxGap);
}

function matchErrorEntry(
  err: IndexError,
  query: ParsedQuery,
  maxGap: number,
): boolean {
  if (!query.slots.length) return false;
  const before = err.before;
  if (!before || before === "∅") return false;

  // Exact / contains for single form
  if (query.slots.length === 1 && query.slots[0].kind === "form") {
    const v = query.slots[0].value;
    return before === v || before.includes(v);
  }

  const seq = err.before_tokens?.length
    ? err.before_tokens
    : [{ form: before, upos: "X" }];
  return findSequence(seq, query.slots, maxGap).length > 0;
}

function passesCorrectFilter(tokenIds: number[], sentence: IndexSentence): boolean {
  const set = new Set(tokenIds);
  // Exclude hits that are entirely (or partially) on correction sites
  return !sentence.tokens.some((t) => set.has(t.tid) && t.is_correction_site);
}

export interface SearchOptions {
  lang: LangFilter;
  usage: UsageFilter;
  maxGap?: number;
}

export interface SearchResultItem {
  sentence: IndexSentence;
  hit: MatchHit;
  contextBefore: IndexSentence[];
  contextAfter: IndexSentence[];
}

function neighbors(
  index: SearchIndex,
  sentence: IndexSentence,
  beforeN: number,
  afterN: number,
): { before: IndexSentence[]; after: IndexSentence[] } {
  const bySid = new Map(
    index.sentences
      .filter((s) => s.essay_id === sentence.essay_id)
      .map((s) => [s.sid, s]),
  );
  const before: IndexSentence[] = [];
  for (let i = Math.max(0, sentence.prev_sids.length - beforeN); i < sentence.prev_sids.length; i++) {
    const s = bySid.get(sentence.prev_sids[i]);
    if (s) before.push(s);
  }
  const after: IndexSentence[] = [];
  for (let i = 0; i < Math.min(afterN, sentence.next_sids.length); i++) {
    const s = bySid.get(sentence.next_sids[i]);
    if (s) after.push(s);
  }
  return { before, after };
}

export function searchCorpus(
  index: SearchIndex,
  rawQuery: string,
  options: SearchOptions,
  contextBeforeN: number,
  contextAfterN: number,
): SearchResultItem[] {
  const query = parseQuery(rawQuery);
  if (!query.slots.length) return [];
  const maxGap = options.maxGap ?? DEFAULT_GAP;
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  for (const sentence of index.sentences) {
    if (sentence.l2_lang !== options.lang) continue;

    const pushErrorHits = () => {
      const matchedErrors: string[] = [];
      for (const err of sentence.errors) {
        if (matchErrorEntry(err, query, maxGap)) matchedErrors.push(err.eid);
      }
      if (!matchedErrors.length) return;
      const key = `${sentence.essay_id}:${sentence.sid}:err:${matchedErrors.join(",")}`;
      if (seen.has(key)) return;
      seen.add(key);
      const { before, after } = neighbors(index, sentence, contextBeforeN, contextAfterN);
      results.push({
        sentence,
        hit: {
          sent_idx: sentence.sent_idx,
          token_ids: sentence.errors
            .filter((e) => matchedErrors.includes(e.eid))
            .flatMap((e) => e.after_token_ids),
          error_ids: matchedErrors,
          channel: "error",
        },
        contextBefore: before,
        contextAfter: after,
      });
    };

    const pushFieldHits = () => {
      const seqs = matchFieldSentence(sentence, query, maxGap);
      for (const tokenIds of seqs) {
        if (options.usage === "correct" && !passesCorrectFilter(tokenIds, sentence)) {
          continue;
        }
        const key = `${sentence.essay_id}:${sentence.sid}:field:${tokenIds.join("-")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const { before, after } = neighbors(index, sentence, contextBeforeN, contextAfterN);
        results.push({
          sentence,
          hit: {
            sent_idx: sentence.sent_idx,
            token_ids: tokenIds,
            error_ids: [],
            channel: "field",
          },
          contextBefore: before,
          contextAfter: after,
        });
      }
    };

    if (options.usage === "incorrect") {
      pushErrorHits();
      continue;
    }
    if (options.usage === "correct") {
      pushFieldHits();
      continue;
    }
    // all: union of field + error channels
    pushFieldHits();
    pushErrorHits();
  }

  return results;
}

export function highlightTokens(
  tokens: IndexToken[],
  highlightTids: Set<number>,
  errorTids: Set<number>,
): { text: string; highlight: boolean; error: boolean }[] {
  return tokens.map((t) => ({
    text: t.form,
    highlight: highlightTids.has(t.tid),
    error: errorTids.has(t.tid),
  }));
}
