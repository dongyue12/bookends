const fs = require('fs');
const path = require('path');
const { scan } = require('./lib/parser');
const { renderShelf, renderCategory } = require('./lib/renderer');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, '_posts');
const DIST_DIR = path.join(ROOT, 'dist');
const STYLES_DIR = path.join(ROOT, 'src', 'styles');
const CONFIG_FILE = path.join(ROOT, 'config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {};
}

function applyConfig(categories, config) {
  // 自定义标签名
  if (config.labels) {
    for (const cat of categories) {
      if (config.labels[cat.name]) {
        cat.label = config.labels[cat.name];
      }
    }
  }

  // 自定义排序
  if (config.order) {
    const map = new Map(categories.map(c => [c.name, c]));
    const ordered = [];
    for (const name of config.order) {
      const cat = map.get(name);
      if (cat) {
        ordered.push(cat);
        map.delete(name);
      }
    }
    // 未列出的放最后，保持原顺序
    return ordered.concat([...map.values()]);
  }

  return categories;
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyAssets(cat, catDir, catPath) {
  // 拷贝 img/ 目录（分类级别，含 cover）
  const imgSrc = path.join(catPath, 'img');
  const imgDest = path.join(catDir, 'img');
  if (fs.existsSync(imgSrc)) {
    copyDir(imgSrc, imgDest);
  }

  // 拷贝章节内的 img/
  if (cat.chapters) {
    for (const ch of cat.chapters) {
      const chPath = path.join(catPath, ch.name);
      const chImgSrc = path.join(chPath, 'img');
      const chImgDest = path.join(catDir, ch.name, 'img');
      if (fs.existsSync(chImgSrc)) {
        copyDir(chImgSrc, chImgDest);
      }
    }
  }
}

function build() {
  console.log('Building...');

  // 1. 清空 dist
  emptyDir(DIST_DIR);

  // 2. 扫描 _posts
  const data = scan(POSTS_DIR);
  const config = loadConfig();
  data.categories = applyConfig(data.categories, config);
  console.log(`Found ${data.categories.length} categories`);

  // 3. 渲染书架主页
  const shelfHtml = renderShelf(data.categories);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), shelfHtml, 'utf-8');

  // 4. 渲染每个分类页到 _posts/
  const postsDir = path.join(DIST_DIR, '_posts');
  for (const cat of data.categories) {
    const catDir = path.join(postsDir, cat.slug);
    fs.mkdirSync(catDir, { recursive: true });

    const catHtml = renderCategory(cat);
    fs.writeFileSync(path.join(catDir, 'index.html'), catHtml, 'utf-8');

    // 拷贝静态资源
    const catPath = path.join(POSTS_DIR, cat.name);
    copyAssets(cat, catDir, catPath);

    console.log(`  ${cat.name} (${cat.slug}/)`);
  }

  // 5. 拷贝样式和 mermaid 到 assets/
  const assetsDir = path.join(DIST_DIR, 'assets');
  copyDir(STYLES_DIR, assetsDir);
  const mermaidSrc = path.join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  fs.copyFileSync(mermaidSrc, path.join(assetsDir, 'mermaid.min.js'));

  // 6. 拷贝 favicon
  const faviconSrc = path.join(ROOT, 'src', 'favicon.svg');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(DIST_DIR, 'favicon.svg'));
  }

  console.log('Done. Output in dist/');
}

build();
