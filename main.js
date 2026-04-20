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

// --- Lightning Effect for Home Page ---
function initLightningEffect() {
  const heroArt = document.querySelector('.hero-art');
  if (!heroArt) return; // Only run on home page
  
  const canvas = document.createElement('canvas');
  heroArt.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  
  let w, h;
  function resize() {
    const rect = heroArt.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  class Lightning {
    constructor() {
      this.active = false;
    }
    fire() {
      // Create lightning inside the approximate area of the brain
      this.x = w * (0.35 + Math.random() * 0.3); 
      this.y = h * (0.35 + Math.random() * 0.3);
      this.path = [{x: this.x, y: this.y}];
      this.branches = [];
      
      let cx = this.x;
      let cy = this.y;
      for (let i = 0; i < 4 + Math.random() * 5; i++) {
        cx += (Math.random() - 0.5) * (w * 0.15);
        cy += (Math.random() - 0.5) * (h * 0.15);
        this.path.push({x: cx, y: cy});
        
        if (Math.random() > 0.5) {
          let bx = cx, by = cy;
          let branch = [{x: bx, y: by}];
          for(let j = 0; j < 2 + Math.random() * 3; j++) {
            bx += (Math.random() - 0.5) * (w * 0.1);
            by += (Math.random() - 0.5) * (h * 0.1);
            branch.push({x: bx, y: by});
          }
          this.branches.push(branch);
        }
      }
      this.active = true;
      this.opacity = 0.5 + Math.random() * 0.4;
    }
    draw(ctx) {
      if (!this.active) return;
      
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for(let i=1; i<this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
      for(let b of this.branches) {
        ctx.moveTo(b[0].x, b[0].y);
        for(let i=1; i<b.length; i++) {
          ctx.lineTo(b[i].x, b[i].y);
        }
      }
      
      ctx.strokeStyle = `rgba(180, 200, 255, ${this.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(140, 180, 255, ${this.opacity})`;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      this.opacity *= 0.82; // fade out fast
      if (this.opacity < 0.02) this.active = false;
    }
  }

  const sparks = [new Lightning(), new Lightning(), new Lightning()];
  
  function animate() {
    ctx.clearRect(0, 0, w, h);
    
    // Very occasional random firing for subtle effect
    sparks.forEach(spark => {
      if (!spark.active && Math.random() < 0.015) {
        spark.fire();
      }
      spark.draw(ctx);
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Start the effect
initLightningEffect();