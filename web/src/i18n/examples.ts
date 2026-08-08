import type { LangFilter, UsageFilter } from "../lib/types";
import type { UiLocale } from "./messages";

export type SearchExample = {
  query: string;
  lang: LangFilter;
  usage: UsageFilter;
  /** Full example line shown under the subtitle */
  line: string;
};

/** Verified against the 2026-08 index (161 essays; still includes CJL001 / JLCW_001). */
export const SEARCH_EXAMPLES: Record<UiLocale, SearchExample[]> = {
  ja: [
    {
      query: "趣味",
      lang: "ja",
      usage: "incorrect",
      line: "趣味　「日本語作文」「誤用」　で検索",
    },
    {
      query: "動詞+名詞",
      lang: "ja",
      usage: "all",
      line: "動詞+名詞　「日本語作文」「すべて」　で検索（品詞共起・例：持てる+努力）",
    },
    {
      query: "興味+動詞",
      lang: "ja",
      usage: "all",
      line: "興味+動詞　「日本語作文」「すべて」　で検索（語形+品詞）",
    },
    {
      query: "分野",
      lang: "zh",
      usage: "incorrect",
      line: "分野　「中国語作文」「誤用」　で検索",
    },
    {
      query: "看+名词",
      lang: "zh",
      usage: "all",
      line: "看+名词　「中国語作文」「すべて」　で検索（語形+品詞）",
    },
  ],
  zh: [
    {
      query: "趣味",
      lang: "ja",
      usage: "incorrect",
      line: "趣味　在「日语作文」「错误」下检索",
    },
    {
      query: "动词+名词",
      lang: "ja",
      usage: "all",
      line: "动词+名词　在「日语作文」「全部」下检索（词性共现，如：持てる+努力）",
    },
    {
      query: "興味+动词",
      lang: "ja",
      usage: "all",
      line: "興味+动词　在「日语作文」「全部」下检索（词形+词性）",
    },
    {
      query: "分野",
      lang: "zh",
      usage: "incorrect",
      line: "分野　在「汉语作文」「错误」下检索",
    },
    {
      query: "看+名词",
      lang: "zh",
      usage: "all",
      line: "看+名词　在「汉语作文」「全部」下检索（词形+词性）",
    },
  ],
  en: [
    {
      query: "趣味",
      lang: "ja",
      usage: "incorrect",
      line: "趣味　with Japanese essays + Incorrect",
    },
    {
      query: "VERB+NOUN",
      lang: "ja",
      usage: "all",
      line: "VERB+NOUN　with Japanese essays + All (POS co-occurrence, e.g. 持てる+努力)",
    },
    {
      query: "興味+VERB",
      lang: "ja",
      usage: "all",
      line: "興味+VERB　with Japanese essays + All (form + POS)",
    },
    {
      query: "分野",
      lang: "zh",
      usage: "incorrect",
      line: "分野　with Chinese essays + Incorrect",
    },
    {
      query: "看+NOUN",
      lang: "zh",
      usage: "all",
      line: "看+NOUN　with Chinese essays + All (form + POS)",
    },
  ],
};
