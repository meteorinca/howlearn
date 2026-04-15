function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const html = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      html.push('<hr>');
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }

    if (line.startsWith('>')) {
      closeList();
      const quoteText = line.replace(/^>\s?/, '');
      html.push(`<blockquote>${inlineMarkdown(escapeHtml(quoteText))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(escapeHtml(line))}</p>`);
  }

  closeList();
  return html.join('\n');
}

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  const titleEl = document.getElementById('post-title');
  const subtitleEl = document.getElementById('post-subtitle');
  const metaEl = document.getElementById('post-meta');
  const articleEl = document.getElementById('article-body');

  try {
    const manifestResponse = await fetch('posts/manifest.json');
    if (!manifestResponse.ok) throw new Error('Could not load manifest');
    const posts = await manifestResponse.json();

    const post = posts.find(item => item.id === postId) || posts[0];
    if (!post) throw new Error('No post found');

    document.title = `${post.title} | How Brains Learn`;
    document.getElementById('meta-desc').setAttribute('content', post.subtitle || post.title || 'How Brains Learn');
    titleEl.textContent = post.title || 'Untitled';
    subtitleEl.textContent = post.subtitle || '';

    const metaBits = [];
    if (post.date) metaBits.push(formatDate(post.date));
    if (post.readingTime) metaBits.push(`${post.readingTime} min read`);
    metaEl.textContent = metaBits.join(' · ');

    const articleResponse = await fetch(post.file);
    if (!articleResponse.ok) throw new Error(`Could not load ${post.file}`);
    const markdown = await articleResponse.text();
    articleEl.innerHTML = markdownToHtml(markdown);
  } catch (error) {
    titleEl.textContent = 'Could not load post';
    subtitleEl.textContent = '';
    metaEl.textContent = '';
    articleEl.innerHTML = '<p>Could not load the markdown file. Make sure the post exists in <code>posts/</code> and is listed in <code>posts/manifest.json</code>.</p>';
    console.error(error);
  }
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

loadPost();
