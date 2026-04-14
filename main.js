/* ─────────────────────────────────────────────────────────────
   main.js — HowLearn index page
   Loads posts/manifest.json and renders article cards.
───────────────────────────────────────────────────────────── */

// ── Progress bar ─────────────────────────────────────────────
const progressBar = document.getElementById('progress-bar');
function updateProgress() {
  const scrolled = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = max > 0 ? `${(scrolled / max) * 100}%` : '0%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// ── Intersection Observer — reveal animations ─────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => io.observe(el));

// ── Card mouse-glow effect ────────────────────────────────────
function bindCardGlow(card) {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    card.style.setProperty('--mx', `${x}%`);
    card.style.setProperty('--my', `${y}%`);
  });
}

// ── Format date ────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Build card HTML ───────────────────────────────────────────
function buildCard(post, index) {
  const num     = String(index + 1).padStart(2, '0');
  const tags    = (post.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('');
  const dateStr = post.date ? formatDate(post.date) : '';

  const card = document.createElement('a');
  card.className = 'article-card';
  card.href = `post.html?id=${post.id}`;
  card.setAttribute('aria-label', post.title);

  card.innerHTML = `
    <p class="card-num">Essay ${num}</p>
    <h2 class="card-title">${post.title}</h2>
    <p class="card-subtitle">${post.subtitle || ''}</p>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-footer">
      <span>${dateStr}${post.readingTime ? ` · ${post.readingTime} min read` : ''}</span>
      <span class="card-read-link">
        Read
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7h8M8 4l3 3-3 3"/>
        </svg>
      </span>
    </div>
  `;

  bindCardGlow(card);
  return card;
}

// ── Load manifest & render ─────────────────────────────────────
async function init() {
  const grid = document.getElementById('articles-grid');

  try {
    const res = await fetch('posts/manifest.json');
    if (!res.ok) throw new Error('manifest not found');
    const posts = await res.json();

    grid.innerHTML = '';

    if (!posts.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-sans);font-size:.9rem;">No articles yet. Check back soon.</p>';
      return;
    }

    posts.forEach((post, i) => {
      grid.appendChild(buildCard(post, i));
    });

    // Re-observe the newly populated grid for stagger animation
    io.observe(grid);

  } catch (err) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-family:var(--font-sans);font-size:.9rem;">
      Could not load articles. <br><small>If viewing locally, serve via a local server (e.g. <code>npx serve .</code>).</small>
    </p>`;
    console.error('[HowLearn] Error loading manifest:', err);
  }
}

init();
