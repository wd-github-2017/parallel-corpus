export type UiLocale = "zh" | "en" | "ja";

export const UI_LOCALES: { id: UiLocale; label: string }[] = [
  { id: "ja", label: "日本語" },
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

type Messages = {
  brandTitle: string;
  brandSubtitle: string;
  examplesTitle: string;
  searchPlaceholder: string;
  searchAria: string;
  search: string;
  downloadCsv: string;
  downloadResults: string;
  downloading: string;
  corpusLang: string;
  essayJa: string;
  essayZh: string;
  usage: string;
  usageAll: string;
  usageCorrect: string;
  usageIncorrect: string;
  context: string;
  before: string;
  after: string;
  sentencesUnit: string;
  hint: string;
  loadError: string;
  loading: string;
  stats: string;
  noResults: string;
  channelError: string;
  channelField: string;
  uiLanguage: string;
  downloadDone: string;
};

export const messages: Record<UiLocale, Messages> = {
  zh: {
    brandTitle: "Parallel Learner Corpus",
    brandSubtitle:
      "中日双语平行学习者语料库 Demo。支持词形 / 共现 / 词性模式检索，并可限定正确或误用。",
    examplesTitle: "检索示例（点击即可填入）",
    searchPlaceholder: "输入检索式后点击检索",
    searchAria: "检索式",
    search: "检索",
    downloadCsv: "下载语料 CSV",
    downloadResults: "下载检索结果",
    downloading: "准备下载…",
    corpusLang: "作文语种",
    essayJa: "日语作文",
    essayZh: "汉语作文",
    usage: "用法",
    usageAll: "全部",
    usageCorrect: "正确",
    usageIncorrect: "错误",
    context: "上下文",
    before: "前",
    after: "后",
    sentencesUnit: "句",
    hint: "分词基于 text_l2-field；误用检索基于 text_l2-marked 的【修改前|类型|修改后】。词性可用中文/日文别名或 UPOS（NOUN/VERB…）。",
    loadError: "索引加载失败：",
    loading: "正在加载语料索引…",
    stats: "共 {essays} 篇 / {sentences} 句 · 命中 {hits} 条",
    noResults: "无结果。可试：日语+错误「趣味」，或日语+全部「日本語」。",
    channelError: "误用通道",
    channelField: "field 通道",
    uiLanguage: "界面语言",
    downloadDone: "已开始下载",
  },
  en: {
    brandTitle: "Parallel Learner Corpus",
    brandSubtitle:
      "A Chinese–Japanese parallel learner corpus demo. Search by word form, co-occurrence, or POS patterns, with correct/incorrect usage filters.",
    examplesTitle: "Search examples (click to fill)",
    searchPlaceholder: "Enter a query, then search",
    searchAria: "Search query",
    search: "Search",
    downloadCsv: "Download corpus CSV",
    downloadResults: "Download results",
    downloading: "Preparing…",
    corpusLang: "Essay language",
    essayJa: "Japanese essays",
    essayZh: "Chinese essays",
    usage: "Usage",
    usageAll: "All",
    usageCorrect: "Correct",
    usageIncorrect: "Incorrect",
    context: "Context",
    before: "Before",
    after: "After",
    sentencesUnit: "sent.",
    hint: "Tokenization uses text_l2-field only. Incorrect-usage search reads 【before|type|after】 from text_l2-marked. POS aliases or UPOS (NOUN/VERB…) are accepted.",
    loadError: "Failed to load index: ",
    loading: "Loading corpus index…",
    stats: "{essays} essays / {sentences} sentences · {hits} hits",
    noResults: "No results. Try Japanese + Incorrect「趣味」, or Japanese + All「日本語」.",
    channelError: "Error channel",
    channelField: "Field channel",
    uiLanguage: "UI language",
    downloadDone: "Download started",
  },
  ja: {
    brandTitle: "Parallel Learner Corpus",
    brandSubtitle:
      "日中バイリンガル学習者コーパスのデモです。語形・共起・品詞パターン検索と、正用／誤用の絞り込みに対応します。",
    examplesTitle: "検索例（クリックで入力）",
    searchPlaceholder: "検索式を入力して検索",
    searchAria: "検索式",
    search: "検索",
    downloadCsv: "コーパスをCSVで保存",
    downloadResults: "検索結果を保存",
    downloading: "準備中…",
    corpusLang: "作文の言語",
    essayJa: "日本語作文",
    essayZh: "中国語作文",
    usage: "用法",
    usageAll: "すべて",
    usageCorrect: "正用",
    usageIncorrect: "誤用",
    context: "文脈",
    before: "前",
    after: "後",
    sentencesUnit: "文",
    hint: "分かち書きは text_l2-field のみ。誤用検索は text_l2-marked の【修正前|類型|修正後】に基づきます。品詞は日中別名または UPOS（NOUN/VERB…）が使えます。",
    loadError: "インデックスの読み込みに失敗：",
    loading: "コーパスを読み込み中…",
    stats: "{essays} 編 / {sentences} 文 · ヒット {hits} 件",
    noResults: "結果なし。日本語+誤用「趣味」、または日本語+すべて「日本語」を試してください。",
    channelError: "誤用チャネル",
    channelField: "field チャネル",
    uiLanguage: "表示言語",
    downloadDone: "ダウンロードを開始しました",
  },
};

const STORAGE_KEY = "plc-ui-locale";

export function detectUiLocale(): UiLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en" || saved === "ja") return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .map((l) => l.toLowerCase());
  for (const lang of nav) {
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("ja")) return "ja";
  }
  return "en";
}

export function persistUiLocale(locale: UiLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function t(
  locale: UiLocale,
  key: keyof Messages,
  vars?: Record<string, string | number>,
): string {
  let s = messages[locale][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
