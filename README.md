# Parallel Learner Corpus

中日双语平行学习者语料库 Demo：静态检索界面，可部署到 GitHub Pages。

## 功能

- 选择 **日语作文** / **汉语作文**（按 `group`：`zh_jp` → L2=ja，`jp_zh` → L2=zh）
- 限定用法：**全部** / **正确** / **错误**
- 检索式：
  - 单词语/形态素：`趣味`
  - 多词语共现：`吃米饭` 或 `吃 米饭`
  - 词性模式：`吃+名词`、`动词+名词`（支持中日别名与 UPOS）
- 结果以 **句** 为单位，可设置前后文句数
- 界面语言：中文 / English / 日本語（按系统语言自动选择；手动切换写入 `localStorage`）
- **下载语料 CSV**：句级导出，**UTF-8 with BOM**（`U+FEFF`），避免 Excel 日文乱码

## 数据约定

| 字段 | 用途 |
|------|------|
| `text_l2-field` / `text_l1-field` | **唯一**分词与词性标注对象 |
| `text_l2-marked` | 语病层：`【修改前\|错误类型\|修改后】`，不参与分词 |
| `group` | 语种方向 |

权威数据：`data/canonical/*.json`  
前端索引：`data/search-index.json`（同步到 `web/public/`）

## 本地运行

### 1. Python 管线

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/run_pipeline.py
```

### 2. 前端

```bash
cd web
npm install
VITE_BASE=/ npm run dev
```

浏览器打开终端提示的本地地址。

生产构建：

```bash
cd web
VITE_BASE=/ npm run build
VITE_BASE=/ npm run preview
```

GitHub Pages 项目站默认 `base` 为 `/parallel-corpus/`（见 `web/vite.config.ts`）。若仓库名不同，构建时设置：

```bash
VITE_BASE=/你的仓库名/ npm run build
```

## 部署到 GitHub Pages

### 方式 A：使用预构建目录 `github-pages/`

仓库内已有分发包 [`github-pages/`](github-pages/)（含 `index.html`、资源与 `search-index.json`）。

最简单：复制到 `docs/` 后在 Pages 设置中选 **Branch → /docs**：

```bash
rm -rf docs && cp -R github-pages docs
# 然后 git add docs && 推送；Pages Source = Deploy from a branch，Folder = /docs
```

访问地址约为：`https://<user>.github.io/parallel-corpus/`

### 方式 B：GitHub Actions

1. 将本仓库推送到 GitHub
2. Settings → Pages → Source 选 **GitHub Actions**
3. 推送到 `main`/`master` 或手动运行 workflow `Deploy GitHub Pages`

## 正误检索说明

- **错误**：在 `text_l2-marked` 中匹配语病的 **修改前**
- **正确**：在 `text_l2-field` token 序列上命中，并排除「修改后」对齐到的纠错位点 token
- **全部**：field 通道与误用通道的并集

日语分词使用 Sudachi **A 单位**（短单位），例如「日本語」会切成「日本」「語」。连续检索串会按 field 表面子串映射到覆盖的 token。

## 目录

```
corpus-data/          原始 Excel
scripts/              预处理管线
data/canonical/       权威 JSON
data/search-index.json
web/                  Vite + React 检索 UI
resource/DESIGN-meta.md
```

## 后续（服务器版）

同一 canonical JSON 可导入 PostgreSQL/SQLite，用 FastAPI 提供检索 API；前端仅替换 `search.ts` 的数据源即可。
