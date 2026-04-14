/* ─────────────────────────────────────────────────────────────
   post.js — HowLearn single-article page
   
   Reads ?id=<post-id> from the URL, fetches the matching
   manifest entry, fetches the .md file, parses it into HTML,
   extracts [!key] and [!quote] callouts for the sidebar, and
   wires up all interactions.
───────────────────────────────────────────────────────────── */

// ── Progress bar ─────────────────────────────────────────────
const progressBar = document.getElementById('progress-bar');
function updateProgress() {
  const scrolled = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = max > 0 ? `${(scrolled / max) * 100}%` : '0%';
}
window.addEventListener('scroll', updateProgress, { passive: true });

// ── Reveal observer ───────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

// ─────────────────────────────────────────────────────────────
// Minimal but solid Markdown → HTML converter
// Handles: headings, bold, italic, hr, lists, paragraphs,
//          and the custom callout blocks [!key] / [!quote]
// ─────────────────────────────────────────────────────────────
function parseMarkdown(md) {
  // Normalise line endings
  md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = md.split('\n');
  let html = '';
  let i = 0;

  function parseLine(line) {
    // bold+italic, bold, italic
    line = line
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/__(.+?)__/g,     '<strong>$1</strong>')
      .replace(/_(.+?)_/g,       '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>');
    return line;
  }

  while (i < lines.length) {
    const raw  = lines[i];
    const line = raw.trimEnd();

    // ── Headings ────────────────────────────────────────────
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      const text  = parseLine(h[2]);
      const slug  = h[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      html += `<h${level} id="${slug}">${text}</h${level}>\n`;
      i++; continue;
    }

    // ── HR ──────────────────────────────────────────────────
    if (/^---+$/.test(line)) {
      html += '<hr>\n';
      i++; continue;
    }

    // ── Callout block  >  [!key]  or  > [!quote] ───────────
    // Collect all consecutive "> " lines as one block
    if (/^>\s/.test(line) || line === '>') {
      const blockLines = [];
      while (i < lines.length && (/^>\s/.test(lines[i]) || lines[i] === '>')) {
        blockLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const first = blockLines[0].trim();
      const typeMatch = first.match(/^\[!(key|quote)\]$/i);
      if (typeMatch) {
        const type    = typeMatch[1].toLowerCase();
        const content = blockLines.slice(1).join(' ').trim();
        const icon    = type === 'key' ? '✦' : '❝';
        const cls     = type === 'key' ? 'callout-key' : 'callout-quote';
        html += `<div class="${cls}" data-callout="${type}">\n`;
        html += `  <span class="callout-icon">${icon}</span>${parseLine(content)}\n`;
        html += `</div>\n`;
      } else {
        // Generic blockquote
        const content = blockLines.join(' ').trim();
        html += `<blockquote class="callout-quote"><span class="callout-icon">❝</span>${parseLine(content)}</blockquote>\n`;
      }
      continue;
    }

    // ── Unordered list ──────────────────────────────────────
    if (/^[-*+]\s/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trimEnd())) {
        const item = parseLine(lines[i].trimEnd().replace(/^[-*+]\s/, ''));
        html += `  <li>${item}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // ── Ordered list ────────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
        const item = parseLine(lines[i].trimEnd().replace(/^\d+\.\s/, ''));
        html += `  <li>${item}</li>\n`;
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // ── Blank line ──────────────────────────────────────────
    if (line.trim() === '') {
      i++; continue;
    }

    // ── Paragraph ───────────────────────────────────────────
    // Collect consecutive non-special lines as one paragraph
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trimEnd()) &&
      !/^[>\-*+\d]/.test(lines[i])
    ) {
      paraLines.push(parseLine(lines[i].trimEnd()));
      i++;
    }
    if (paraLines.length) {
      html += `<p>${paraLines.join(' ')}</p>\n`;
    }
  }

  return html;
}

// ─────────────────────────────────────────────────────────────
// Extract callouts from rendered HTML for sidebar
// ─────────────────────────────────────────────────────────────
function extractHighlights(container) {
  const callouts = container.querySelectorAll('[data-callout]');
  return Array.from(callouts).map(el => ({
    type: el.dataset.callout,
    text: el.innerText.replace(/^[✦❝]\s*/, '').trim()
  }));
}

// ─────────────────────────────────────────────────────────────
// Build sidebar Table of Contents
// ─────────────────────────────────────────────────────────────
function buildTOC(container, tocEl) {
  const headings = container.querySelectorAll('h2, h3');
  if (!headings.length) return;

  headings.forEach(h => {
    const a = document.createElement('a');
    a.href    = `#${h.id}`;
    a.textContent = h.textContent;
    if (h.tagName === 'H3') a.style.paddingLeft = '1.1rem';
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(h.id);
      if (target) {
        const y = target.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
    tocEl.appendChild(a);
  });
}

// ─────────────────────────────────────────────────────────────
// Active TOC highlight on scroll
// ─────────────────────────────────────────────────────────────
function watchTOC(container, tocEl) {
  const headings  = Array.from(container.querySelectorAll('h2[id], h3[id]'));
  const links     = Array.from(tocEl.querySelectorAll('a'));
  if (!headings.length) return;

  function update() {
    let active = headings[0]?.id;
    headings.forEach(h => {
      if (h.getBoundingClientRect().top < 110) active = h.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === `#${active}`);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ─────────────────────────────────────────────────────────────
// Render highlights into sidebar
// ─────────────────────────────────────────────────────────────
function renderHighlights(highlights, listEl) {
  listEl.innerHTML = '';
  highlights.forEach(({ type, text }) => {
    const card = document.createElement('div');
    card.className = `hl-card hl-card--${type}`;
    card.innerHTML = `
      <span class="hl-icon">${type === 'key' ? '✦ Key insight' : '❝ Notable quote'}</span>
      <span class="hl-text">${text}</span>
    `;
    // Subtle 3-D tilt
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top)  / r.height - 0.5) * -6;
      const ry = ((e.clientX - r.left) / r.width  - 0.5) *  6;
      card.style.transform = `translateY(-2px) perspective(400px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    listEl.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
// Build post hero section from manifest metadata
// ─────────────────────────────────────────────────────────────
function buildHero(post) {
  const tags    = (post.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join('');
  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const heroEl = document.createElement('section');
  heroEl.className = 'post-hero reveal';
  heroEl.innerHTML = `
    <p class="eyebrow">Essay</p>
    <h1>${post.title}</h1>
    ${post.subtitle ? `<p class="post-subtitle">${post.subtitle}</p>` : ''}
    <div class="post-meta">
      ${dateStr ? `<span>${dateStr}</span><span class="post-meta-sep">·</span>` : ''}
      ${post.readingTime ? `<span>${post.readingTime} min read</span>` : ''}
      ${tags ? `<div style="display:flex;gap:.45rem;flex-wrap:wrap">${tags}</div>` : ''}
    </div>
  `;
  return heroEl;
}

// ─────────────────────────────────────────────────────────────
// Main — resolve post id, fetch, render
// ─────────────────────────────────────────────────────────────
async function init() {
  const params  = new URLSearchParams(window.location.search);
  const postId  = params.get('id');

  const articleEl   = document.getElementById('article-body');
  const heroEl      = document.getElementById('post-hero');
  const tocEl       = document.getElementById('toc');
  const tocPanel    = document.getElementById('toc-panel');
  const hlPanel     = document.getElementById('highlights-panel');
  const hlList      = document.getElementById('highlights-list');

  if (!postId) {
    articleEl.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-sans)">No article ID in URL. Go back and choose an article.</p>';
    return;
  }

  try {
    // 1. Load manifest and find matching post
    const manifestRes = await fetch('posts/manifest.json');
    if (!manifestRes.ok) throw new Error('Cannot load manifest');
    const posts = await manifestRes.json();
    const post  = posts.find(p => p.id === postId);
    if (!post) throw new Error(`Post "${postId}" not found in manifest`);

    // 2. Update page meta
    document.title = `${post.title} — HowLearn`;
    document.getElementById('meta-desc').content = post.subtitle || post.title;

    // 3. Render hero
    const hero = buildHero(post);
    heroEl.appendChild(hero);
    io.observe(hero);

    // 4. Fetch and parse markdown
    const mdRes = await fetch(post.file);
    if (!mdRes.ok) throw new Error(`Cannot load ${post.file}`);
    const md = await mdRes.text();

    const bodyHTML = parseMarkdown(md);
    articleEl.innerHTML = bodyHTML;

    // 5. Build TOC
    buildTOC(articleEl, tocEl);
    if (tocEl.children.length) {
      tocPanel.style.display = '';
      watchTOC(articleEl, tocEl);
    }

    // 6. Extract highlights
    const highlights = extractHighlights(articleEl);
    if (highlights.length) {
      hlPanel.style.display = '';
      renderHighlights(highlights, hlList);
    }

    // 7. Wire reveal animations
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    updateProgress();

  } catch (err) {
    articleEl.innerHTML = `
      <div class="loading-state" style="padding:2rem">
        <p style="font-family:var(--font-sans);color:var(--text-muted)">
          ⚠ Could not load article.<br>
          <small>${err.message}</small><br><br>
          <small>If running locally, use a dev server:<br>
          <code>npx serve .</code> then visit <code>http://localhost:3000</code></small>
        </p>
      </div>
    `;
    console.error('[HowLearn] post.js error:', err);
  }
}

init();
