export type UsageFilter = "all" | "correct" | "incorrect";
export type LangFilter = "ja" | "zh";

export interface IndexToken {
  tid: number;
  form: string;
  upos: string;
  char_start: number;
  char_end: number;
  is_correction_site: boolean;
}

export interface IndexError {
  eid: string;
  before: string;
  type: string;
  after: string;
  after_token_ids: number[];
  before_tokens: { form: string; upos: string }[];
}

export interface IndexSentence {
  sent_idx: number;
  essay_id: string;
  sid: number;
  l2_lang: string;
  group: string;
  l2_field: string;
  l1_field: string;
  learner_approx: string;
  tokens: IndexToken[];
  errors: IndexError[];
  prev_sids: number[];
  next_sids: number[];
  meta: {
    year?: number | string | null;
    level?: string | null;
    notes?: string | null;
    group?: string;
  };
}

export interface SearchIndex {
  version: number;
  sentence_count: number;
  essay_count: number;
  sentences: IndexSentence[];
  form_postings: Record<string, { essay_id: string; sid: number; tid: number; sent_idx: number }[]>;
  error_before_postings: Record<
    string,
    { essay_id: string; sid: number; eid: string; sent_idx: number }[]
  >;
}

export type QuerySlot =
  | { kind: "form"; value: string }
  | { kind: "pos"; value: string };

export interface ParsedQuery {
  slots: QuerySlot[];
  raw: string;
}

export interface MatchHit {
  sent_idx: number;
  token_ids: number[];
  error_ids: string[];
  channel: "field" | "error";
}
