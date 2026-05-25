function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderShelf(categories) {
  const cards = categories.map(cat => {
    const name = cat.label || cat.name;
    const coverHtml = cat.cover
      ? `<img class="book-cover-img" src="_posts/${cat.slug}/img/${cat.cover}" alt="${escapeHtml(name)}">`
      : `<span class="book-cover-text">${escapeHtml(name)}</span>`;

    return `
    <a href="_posts/${cat.slug}/" class="book-card">
      <div class="book-cover" style="background-color: var(--cover)">
        ${coverHtml}
      </div>
      <span class="book-name">${escapeHtml(name)}</span>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookends</title>
  <link rel="stylesheet" href="assets/main.css">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
</head>
<body class="shelf-page">
  <header class="shelf-header">
    <h1 class="shelf-title">Bookends</h1>
  </header>
  <main class="card-grid">
    ${cards}
  </main>
</body>
</html>`;
}

function renderPostList(cat) {
  if (cat.chapters) {
    return cat.chapters.map(ch => `
      <li class="file-tree-chapter">
        <details open>
          <summary class="chapter-title">${escapeHtml(ch.name)}</summary>
          <ul class="file-tree-posts">
            ${ch.posts.map((p, i) => {
              const pid = `post-${i}`;
              const isFirst = i === 0;
              return `<li class="post-item${isFirst ? ' active' : ''}"><a href="#${pid}">${escapeHtml(p.title)}</a></li>`;
            }).join('\n')}
          </ul>
        </details>
      </li>`).join('\n');
  }

  return `<ul class="file-tree-posts">
    ${cat.posts.map((p, i) => {
      const pid = `post-${i}`;
      const isFirst = i === 0;
      return `<li class="post-item${isFirst ? ' active' : ''}"><a href="#${pid}">${escapeHtml(p.title)}</a></li>`;
    }).join('\n')}
  </ul>`;
}

function flattenPosts(cat) {
  return cat.chapters
    ? cat.chapters.reduce((arr, ch) => arr.concat(ch.posts), [])
    : cat.posts;
}

function renderCategory(cat) {
  const allPosts = flattenPosts(cat);
  const totalPosts = allPosts.length;

  const hasMermaid = allPosts.some(p => p.html.includes('class="mermaid"'));

  const articles = allPosts.map((p, i) => {
    const prev = i > 0
      ? `<a href="#post-${i - 1}" class="pn-link">← ${escapeHtml(allPosts[i - 1].title)}</a>`
      : `<span class="pn-link disabled">← 已是第一篇</span>`;
    const next = i < allPosts.length - 1
      ? `<a href="#post-${i + 1}" class="pn-link">${escapeHtml(allPosts[i + 1].title)} →</a>`
      : `<span class="pn-link disabled">已是最后一篇 →</span>`;

    const hJson = escapeHtml(JSON.stringify(p.headings));

    return `
    <div id="post-${i}" class="post-article" data-headings="${hJson}">
      ${p.html}
      <nav class="post-prev-next">${prev}${next}</nav>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cat.label || cat.name)} - Bookends</title>
  <link rel="stylesheet" href="../../assets/main.css">
  <link rel="stylesheet" href="../../assets/highlight.css">
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg">
  ${hasMermaid ? `<script src="../../assets/mermaid.min.js"></script>
  <script>mermaid.initialize({ startOnLoad: false, theme: 'neutral' });</script>` : ''}
</head>
<body class="category-page">
  <div class="page-container">
    <header class="topbar">
      <button class="tb-btn" id="btn-filetree" title="目录">&#x2261;</button>
      <a href="../../" class="tb-back" title="返回首页">&#x2190;</a>
      <span class="tb-title">${escapeHtml(cat.label || cat.name)}</span>
      <span class="tb-count">${totalPosts} 篇</span>
    </header>

    <div class="main-area">
      <aside class="file-tree" id="filetree">
        ${renderPostList(cat)}
      </aside>

      <main class="post-area" id="postarea">
        ${articles}
      </main>

      <aside class="outline-sidebar" id="outlineSidebar">
        <div class="ol-sidebar-title">目录</div>
        <ul class="ol-list" id="olSidebarList"></ul>
      </aside>
    </div>
  </div>

  <div class="float-btns" id="floatBtns">
    <button class="fb-btn" id="btn-scrolltop" title="返回顶部">&#x2191;</button>
    <button class="fb-btn" id="btn-outline" title="大纲">&#x2630;</button>
  </div>

  <div class="outline-popup" id="outlinePopup">
    <div class="ol-popup-inner">
      <ul class="ol-list" id="olPopupList"></ul>
    </div>
  </div>

  <div class="overlay" id="overlay"></div>

  <script>
(function() {
  var articles = document.querySelectorAll('.post-article');
  var filetree = document.getElementById('filetree');
  var overlay = document.getElementById('overlay');
  var floatBtns = document.getElementById('floatBtns');
  var postItems = document.querySelectorAll('.post-item');
  var olSidebarList = document.getElementById('olSidebarList');
  var outlinePopup = document.getElementById('outlinePopup');

  function renderOutline(article) {
    if (!olSidebarList) return;
    var headings = [];
    try { headings = JSON.parse(article.getAttribute('data-headings') || '[]'); } catch(e) {}
    var html = headings.map(function(h) {
      return '<li class="ol-item ol-h' + h.level + '"><a href="#' + article.id + '" data-heading="' + h.text.replace(/"/g, '&quot;') + '">' + h.text + '</a></li>';
    }).join('');
    olSidebarList.innerHTML = html;
  }

  function scrollToHeading(postId, headingText) {
    var article = document.getElementById(postId);
    if (!article) return;
    if (!article.classList.contains('active')) {
      window.location.hash = postId;
    }
    var headings = article.querySelectorAll('h2, h3');
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].textContent.trim() === headingText) {
        headings[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }

  // 侧栏大纲点击
  if (olSidebarList) {
    olSidebarList.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      var postId = a.getAttribute('href').slice(1);
      var headingText = a.getAttribute('data-heading');
      scrollToHeading(postId, headingText);
    });
  }

  function showPost(id) {
    var target = document.getElementById(id);
    if (!target) return;
    articles.forEach(function(a) { a.classList.remove('active'); });
    target.classList.add('active');
    postItems.forEach(function(item) { item.classList.remove('active'); });
    var link = document.querySelector('.post-item a[href="#' + id + '"]');
    if (link) link.parentElement.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var pa = document.getElementById('postarea');
    if (pa) pa.scrollTo({ top: 0, behavior: 'smooth' });
    renderOutline(target);
    closeFiletree();
  }

  function handleHash() {
    var hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
      showPost(hash);
    } else if (articles.length > 0) {
      window.location.hash = articles[0].id;
    }
  }

  window.addEventListener('hashchange', handleHash);

  // 初始加载
  handleHash();
  var active = document.querySelector('.post-article.active');
  if (active) renderOutline(active);

  var btnFiletree = document.getElementById('btn-filetree');
  if (btnFiletree) btnFiletree.addEventListener('click', function() {
    if (filetree) filetree.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });

  function closeFiletree() {
    if (filetree) filetree.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  if (overlay) overlay.addEventListener('click', closeFiletree);

  function checkScroll() {
    if (!floatBtns) return;
    if (window.scrollY > window.innerHeight) {
      floatBtns.classList.add('visible');
    } else {
      floatBtns.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();

  var btnScrollTop = document.getElementById('btn-scrolltop');
  if (btnScrollTop) btnScrollTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var pa = document.getElementById('postarea');
    if (pa) pa.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var olPopupList = document.getElementById('olPopupList');
  var btnOutline = document.getElementById('btn-outline');
  if (btnOutline) btnOutline.addEventListener('click', function(e) {
    e.stopPropagation();
    if (olSidebarList && olPopupList) {
      olPopupList.innerHTML = olSidebarList.innerHTML;
    }
    if (outlinePopup) outlinePopup.classList.toggle('show');
  });

  // 弹窗大纲点击
  if (olPopupList) {
    olPopupList.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      var postId = a.getAttribute('href').slice(1);
      var headingText = a.getAttribute('data-heading');
      scrollToHeading(postId, headingText);
    });
  }

  document.addEventListener('click', function(e) {
    if (!outlinePopup) return;
    if (!outlinePopup.contains(e.target) && e.target !== document.getElementById('btn-outline')) {
      outlinePopup.classList.remove('show');
    }
  });

  if (typeof mermaid !== 'undefined') mermaid.run();

})();
</script>
</body>
</html>`;
}

module.exports = { renderShelf, renderCategory };
