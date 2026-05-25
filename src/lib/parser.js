const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

const md = new MarkdownIt({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

// Mermaid: 用 <pre class="mermaid"> 渲染，HTML 转义后由 mermaid.js textContent 解码
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  if (token.info.trim() === 'mermaid') {
    return '<pre class="mermaid">\n' + md.utils.escapeHtml(token.content) + '\n</pre>';
  }
  return defaultFence(tokens, idx, options, env, self);
};

const IMG_DIR = 'img';
const COVER_FILES = ['cover.svg', 'cover.png'];

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '');
}

function extractHeadings(html) {
  const headings = [];
  const regex = /<h([23])[^>]*>([^<]*)<\/h[23]>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({ level: parseInt(match[1]), id: '', text: match[2] });
  }
  return headings;
}

function scanPosts(dirPath) {
  const posts = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const mdFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  for (const file of mdFiles) {
    const filePath = path.join(dirPath, file.name);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const html = md.render(raw);
    const headings = extractHeadings(html);
    const title = file.name.replace(/\.md$/, '');
    posts.push({ title, html, headings });
  }
  return posts;
}

function findCover(catPath) {
  const imgPath = path.join(catPath, IMG_DIR);
  for (const name of COVER_FILES) {
    if (fs.existsSync(path.join(imgPath, name))) {
      return name;
    }
  }
  return null;
}

function hasSubdirs(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.some(e => e.isDirectory() && e.name !== IMG_DIR);
}

function scan(baseDir) {
  const categories = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const catPath = path.join(baseDir, entry.name);
    const cat = {
      name: entry.name,
      slug: slugify(entry.name),
      cover: findCover(catPath),
      chapters: null,
      posts: []
    };

    if (hasSubdirs(catPath)) {
      cat.chapters = [];
      const items = fs.readdirSync(catPath, { withFileTypes: true });
      const chapterDirs = items
        .filter(i => i.isDirectory() && i.name !== IMG_DIR)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      for (const ch of chapterDirs) {
        const chapterPath = path.join(catPath, ch.name);
        const posts = scanPosts(chapterPath);
        cat.chapters.push({ name: ch.name, posts });
      }
    } else {
      cat.posts = scanPosts(catPath);
    }

    categories.push(cat);
  }

  return { categories };
}

module.exports = { scan };
