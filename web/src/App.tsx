import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  UI_LOCALES,
  detectUiLocale,
  persistUiLocale,
  t,
  type UiLocale,
} from "./i18n/messages";
import { SEARCH_EXAMPLES, type SearchExample } from "./i18n/examples";
import { downloadCorpusCsv, downloadResultsCsv } from "./lib/downloadCsv";
import { highlightTokens, searchCorpus, type SearchResultItem } from "./lib/search";
import type { LangFilter, SearchIndex, UsageFilter } from "./lib/types";
import "./index.css";

function ResultCard({
  item,
  locale,
}: {
  item: SearchResultItem;
  locale: UiLocale;
}) {
  const hitTids = new Set(item.hit.token_ids);
  const errorTids = new Set(
    item.sentence.errors.flatMap((e) => e.after_token_ids),
  );
  const matchedErrors = new Set(item.hit.error_ids);

  return (
    <article className="result-card">
      <div className="result-meta">
        <span className="badge badge-meta">{item.sentence.essay_id}</span>
        <span className="badge badge-meta">#{item.sentence.sid}</span>
        <span className="badge badge-meta">
          {item.sentence.meta.level ?? "—"} · {item.sentence.meta.year ?? "—"}
        </span>
        <span
          className={
            item.hit.channel === "error"
              ? "badge badge-channel-error"
              : "badge badge-channel-field"
          }
        >
          {item.hit.channel === "error"
            ? t(locale, "channelError")
            : t(locale, "channelField")}
        </span>
      </div>

      <div className="kwic">
        {item.contextBefore.map((s) => (
          <div key={`b-${s.sid}`} className="ctx">
            {s.l2_field}
          </div>
        ))}
        <div className="hit-line">
          {highlightTokens(item.sentence.tokens, hitTids, errorTids).map((tok, i) => (
            <span
              key={i}
              className={tok.highlight ? "tok-hit" : tok.error ? "tok-error" : undefined}
            >
              {tok.text}
            </span>
          ))}
        </div>
        {item.contextAfter.map((s) => (
          <div key={`a-${s.sid}`} className="ctx">
            {s.l2_field}
          </div>
        ))}
      </div>

      {item.sentence.l1_field ? (
        <div className="parallel">
          <strong>L1</strong>
          {item.sentence.l1_field}
        </div>
      ) : null}

      {item.sentence.errors.length > 0 ? (
        <div className="error-list">
          {item.sentence.errors.map((e) => (
            <span
              key={e.eid}
              className="error-chip"
              data-matched={matchedErrors.has(e.eid)}
              title={e.type}
            >
              {e.before === "∅" ? "∅" : e.before} → {e.after === "∅" ? "∅" : e.after}{" "}
              <em style={{ fontStyle: "normal", opacity: 0.75 }}>({e.type})</em>
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function App() {
  const [locale, setLocale] = useState<UiLocale>(() => detectUiLocale());
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("趣味");
  const [lang, setLang] = useState<LangFilter>("ja");
  const [usage, setUsage] = useState<UsageFilter>("incorrect");
  const [beforeN, setBeforeN] = useState(1);
  const [afterN, setAfterN] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadingResults, setDownloadingResults] = useState(false);
  const [submitted, setSubmitted] = useState({
    query: "趣味",
    lang: "ja" as LangFilter,
    usage: "incorrect" as UsageFilter,
    beforeN: 1,
    afterN: 1,
  });

  useEffect(() => {
    document.documentElement.lang =
      locale === "zh" ? "zh-CN" : locale === "ja" ? "ja" : "en";
  }, [locale]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}search-index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SearchIndex) => setIndex(data))
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    return searchCorpus(
      index,
      submitted.query,
      { lang: submitted.lang, usage: submitted.usage },
      submitted.beforeN,
      submitted.afterN,
    );
  }, [index, submitted]);

  function onSearch(e?: FormEvent) {
    e?.preventDefault();
    setSubmitted({
      query,
      lang,
      usage,
      beforeN: Math.max(0, Number(beforeN) || 0),
      afterN: Math.max(0, Number(afterN) || 0),
    });
  }

  function onLocaleChange(next: UiLocale) {
    setLocale(next);
    persistUiLocale(next);
  }

  function onDownload() {
    if (!index || downloading) return;
    setDownloading(true);
    try {
      downloadCorpusCsv(index, "parallel-learner-corpus.csv");
    } finally {
      window.setTimeout(() => setDownloading(false), 400);
    }
  }

  function onDownloadResults() {
    if (!results.length || downloadingResults) return;
    setDownloadingResults(true);
    try {
      downloadResultsCsv(
        results,
        {
          query: submitted.query,
          lang: submitted.lang,
          usage: submitted.usage,
          beforeN: submitted.beforeN,
          afterN: submitted.afterN,
        },
        "search-results.csv",
      );
    } finally {
      window.setTimeout(() => setDownloadingResults(false), 400);
    }
  }

  function applyExample(ex: SearchExample) {
    setQuery(ex.query);
    setLang(ex.lang);
    setUsage(ex.usage);
    setSubmitted({
      query: ex.query,
      lang: ex.lang,
      usage: ex.usage,
      beforeN: Math.max(0, Number(beforeN) || 0),
      afterN: Math.max(0, Number(afterN) || 0),
    });
  }

  return (
    <div className="app">
      <div className="top-bar">
        <div className="filter-group" role="group" aria-label={t(locale, "uiLanguage")}>
          <span className="filter-label">{t(locale, "uiLanguage")}</span>
          {UI_LOCALES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="pill"
              data-active={locale === opt.id}
              onClick={() => onLocaleChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={onDownload}
          disabled={!index || downloading}
        >
          {downloading ? t(locale, "downloading") : t(locale, "downloadCsv")}
        </button>
      </div>

      <header className="brand">
        <h1>{t(locale, "brandTitle")}</h1>
        <p className="brand-grant">
          中国語・日本語「学習者・母語対訳」作文コーパスの構築と母語転移に基づく文法研究　21K13069
          <br />
          研究代表者：福田 翔　富山大学, 学術研究部教養教育学系
        </p>
        <p>{t(locale, "brandSubtitle")}</p>
        <div className="examples">
          <div className="examples-title">{t(locale, "examplesTitle")}</div>
          <ul className="examples-list">
            {SEARCH_EXAMPLES[locale].map((ex) => (
              <li key={`${locale}-${ex.query}-${ex.lang}-${ex.usage}`}>
                <button
                  type="button"
                  className="example-link"
                  onClick={() => applyExample(ex)}
                >
                  {ex.line}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <form onSubmit={onSearch}>
        <div className="search-row">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "searchPlaceholder")}
            aria-label={t(locale, "searchAria")}
          />
          <button className="btn-primary" type="submit" disabled={!index}>
            {t(locale, "search")}
          </button>
        </div>

        <div className="filters">
          <div className="filter-group">
            <span className="filter-label">{t(locale, "corpusLang")}</span>
            <button
              type="button"
              className="pill"
              data-active={lang === "ja"}
              onClick={() => setLang("ja")}
            >
              {t(locale, "essayJa")}
            </button>
            <button
              type="button"
              className="pill"
              data-active={lang === "zh"}
              onClick={() => setLang("zh")}
            >
              {t(locale, "essayZh")}
            </button>
          </div>

          <div className="filter-group">
            <span className="filter-label">{t(locale, "usage")}</span>
            {(
              [
                ["all", "usageAll"],
                ["correct", "usageCorrect"],
                ["incorrect", "usageIncorrect"],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                type="button"
                className="pill"
                data-active={usage === value}
                onClick={() => setUsage(value)}
              >
                {t(locale, labelKey)}
              </button>
            ))}
          </div>

          <div className="context-controls">
            <span className="filter-label">{t(locale, "context")}</span>
            <label>
              {t(locale, "before")}
              <input
                type="number"
                min={0}
                max={10}
                value={beforeN}
                onChange={(e) => setBeforeN(Number(e.target.value))}
              />
              {t(locale, "sentencesUnit")}
            </label>
            <label>
              {t(locale, "after")}
              <input
                type="number"
                min={0}
                max={10}
                value={afterN}
                onChange={(e) => setAfterN(Number(e.target.value))}
              />
              {t(locale, "sentencesUnit")}
            </label>
          </div>
        </div>
      </form>

      <p className="hint">{t(locale, "hint")}</p>

      {loadError ? (
        <p className="status">
          {t(locale, "loadError")}
          {loadError}
        </p>
      ) : !index ? (
        <p className="status">{t(locale, "loading")}</p>
      ) : (
        <>
          <div className="status-row">
            <p className="status">
              {t(locale, "stats", {
                essays: index.essay_count,
                sentences: index.sentence_count,
                hits: results.length,
              })}
            </p>
            <button
              type="button"
              className="btn-secondary btn-secondary-sm"
              onClick={onDownloadResults}
              disabled={results.length === 0 || downloadingResults}
            >
              {downloadingResults
                ? t(locale, "downloading")
                : t(locale, "downloadResults")}
            </button>
          </div>
          <div className="results">
            {results.length === 0 ? (
              <p className="status">{t(locale, "noResults")}</p>
            ) : (
              results.map((item) => (
                <ResultCard
                  key={`${item.sentence.essay_id}-${item.sentence.sid}-${item.hit.token_ids.join("-")}-${item.hit.error_ids.join("-")}`}
                  item={item}
                  locale={locale}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
