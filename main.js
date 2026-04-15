async function loadArticles() {
  const grid = document.getElementById('articles-grid');

  try {
    const response = await fetch('posts/manifest.json');
    if (!response.ok) throw new Error('Could not load manifest');

    const posts = await response.json();
    grid.innerHTML = '';

    if (!Array.isArray(posts) || posts.length === 0) {
      grid.innerHTML = '<div class="loading-card">No articles yet.</div>';
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `post.html?id=${encodeURIComponent(post.id)}`;
      card.innerHTML = `
        <h3 class="card-title">${post.title || 'Untitled'}</h3>
        <p class="card-subtitle">${post.subtitle || ''}</p>
        <div class="card-meta">${formatMeta(post)}</div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = '<div class="loading-card">Could not load articles. Make sure <code>posts/manifest.json</code> exists on GitHub Pages.</div>';
    console.error(error);
  }
}

function formatMeta(post) {
  const bits = [];
  if (post.date) bits.push(formatDate(post.date));
  if (post.readingTime) bits.push(`${post.readingTime} min read`);
  return bits.join(' · ');
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

loadArticles();