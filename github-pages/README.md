# GitHub Pages 分发包

本目录为**已构建好的静态站点**，可直接用于 GitHub Pages 部署。

站点资源路径前缀：`/parallel-corpus/`  
（对应仓库名 `parallel-corpus`。若仓库名不同，需在 `web/` 下用 `VITE_BASE=/你的仓库名/` 重新构建后再复制到此处。）

## 推荐部署方式（docs 文件夹）

1. 将本目录内容复制到仓库根目录的 `docs/`，或把本文件夹改名为 `docs` 并推送
2. GitHub 仓库 → **Settings** → **Pages**
3. Source 选 **Deploy from a branch**
4. Branch 选 `main`（或 `master`），文件夹选 **`/docs`**
5. 保存后等待约 1 分钟，访问：  
   `https://<用户名>.github.io/parallel-corpus/`

## 重新生成本目录

```bash
source .venv/bin/activate
python scripts/run_pipeline.py
cd web
VITE_BASE=/parallel-corpus/ npm run build
cd ..
rm -rf github-pages && mkdir github-pages
cp -R web/dist/. github-pages/
touch github-pages/.nojekyll
```
