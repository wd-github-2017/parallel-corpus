import type { ParsedQuery, QuerySlot } from "./types";

const POS_ALIASES: Record<string, string> = {
  名词: "NOUN",
  名詞: "NOUN",
  noun: "NOUN",
  n: "NOUN",
  动词: "VERB",
  動詞: "VERB",
  verb: "VERB",
  v: "VERB",
  形容词: "ADJ",
  形容詞: "ADJ",
  adj: "ADJ",
  副词: "ADV",
  副詞: "ADV",
  adv: "ADV",
  助词: "PART",
  助詞: "PART",
  particle: "PART",
  代词: "PRON",
  代名詞: "PRON",
  pron: "PRON",
  数词: "NUM",
  数詞: "NUM",
  num: "NUM",
  专有名词: "PROPN",
  固有名詞: "PROPN",
  propn: "PROPN",
  标点: "PUNCT",
  punct: "PUNCT",
  助动词: "AUX",
  助動詞: "AUX",
  aux: "AUX",
  连词: "CCONJ",
  接続詞: "CCONJ",
  cconj: "CCONJ",
  介词: "ADP",
  adp: "ADP",
  感叹词: "INTJ",
  感動詞: "INTJ",
  intj: "INTJ",
  限定词: "DET",
  連体詞: "DET",
  det: "DET",
};

const UPOS = new Set(Object.values(POS_ALIASES));

export function aliasToUpos(label: string): string | null {
  const key = label.trim();
  if (!key) return null;
  const upper = key.toUpperCase();
  if (UPOS.has(upper) || upper === "SCONJ" || upper === "SYM" || upper === "X") {
    return upper;
  }
  return POS_ALIASES[key] ?? POS_ALIASES[key.toLowerCase()] ?? null;
}

function slotFromPiece(piece: string): QuerySlot | null {
  const p = piece.trim();
  if (!p) return null;
  const upos = aliasToUpos(p);
  if (upos) return { kind: "pos", value: upos };
  return { kind: "form", value: p };
}

/** Parse queries like: 吃 / 吃米饭 / 吃 米饭 / 吃+名词 / 动词+名词 */
export function parseQuery(raw: string): ParsedQuery {
  const text = raw.trim();
  if (!text) return { slots: [], raw: text };

  if (text.includes("+")) {
    const slots = text
      .split("+")
      .map(slotFromPiece)
      .filter((s): s is QuerySlot => !!s);
    return { slots, raw: text };
  }

  // space-separated forms/pos
  if (/\s/.test(text)) {
    const slots = text
      .split(/\s+/)
      .map(slotFromPiece)
      .filter((s): s is QuerySlot => !!s);
    return { slots, raw: text };
  }

  // single token or contiguous multi-char phrase as one form slot;
  // search layer may expand contiguous CJK into multi-token match
  return { slots: [{ kind: "form", value: text }], raw: text };
}
