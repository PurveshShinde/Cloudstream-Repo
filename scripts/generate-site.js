import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export function generateHtml(catalog, repoManifest, repoUrl) {
  const plugins = catalog.plugins || [];
  const sources = catalog.sources || [];
  const updatedAt = new Date(catalog.updatedAt || Date.now()).toLocaleString();

  const appDeepLink = repoUrl.replace(/^https?:\/\//i, 'cloudstreamrepo://');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(repoManifest.name)} | CloudStream Repository</title>
  <meta name="description" content="${escapeHtml(repoManifest.description)}">
  <meta name="color-scheme" content="dark">
  <style>
    :root {
      --bg: #0b111e;
      --card-bg: #121c2d;
      --card-border: #23354d;
      --text: #e6edf7;
      --text-muted: #94a8c2;
      --primary: #2d8cf0;
      --primary-hover: #1e70c7;
      --accent: #00d296;
      --tag-bg: #1a293d;
      --tag-border: #2e435f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 64px;
    }
    header {
      text-align: center;
      padding: 36px 0 24px;
    }
    header h1 {
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 12px;
      letter-spacing: -0.02em;
    }
    header p {
      font-size: 1.1rem;
      color: var(--text-muted);
      max-width: 680px;
      margin: 0 auto 24px;
    }
    .action-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      text-decoration: none;
    }
    .btn-secondary {
      background: var(--card-bg);
      border-color: var(--card-border);
      color: var(--text);
    }
    .btn-secondary:hover {
      border-color: var(--primary);
      text-decoration: none;
    }
    .repo-link-box {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
      margin: 0 auto 36px;
      max-width: 780px;
    }
    .repo-link-box label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .input-group {
      display: flex;
      gap: 8px;
    }
    .input-group input {
      flex: 1;
      background: #080d16;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 10px 14px;
      color: var(--text);
      font-family: monospace;
      font-size: 0.9rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }
    .info-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
    }
    .info-card h3 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-card p, .info-card ol {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .info-card ol {
      padding-left: 20px;
      margin-top: 8px;
    }
    .info-card ol li {
      margin-bottom: 6px;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
    }
    .search-box {
      flex: 1;
      min-width: 240px;
    }
    .search-box input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text);
      font-size: 0.95rem;
    }
    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    select {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 0.9rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .plugin-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .plugin-card h4 {
      margin: 0;
      font-size: 1.05rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .version-tag {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--tag-bg);
      border: 1px solid var(--tag-border);
      color: var(--text-muted);
      font-family: monospace;
    }
    .plugin-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
      flex-grow: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .tag {
      font-size: 0.72rem;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--tag-bg);
      border: 1px solid var(--tag-border);
      color: var(--text);
    }
    .tag-source {
      border-color: var(--primary);
      color: #92c5ff;
    }
    .tag-adult {
      border-color: #a84242;
      color: #ff9d9d;
    }
    footer {
      text-align: center;
      padding: 48px 0 24px;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-top: 1px solid var(--card-border);
      margin-top: 48px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(repoManifest.name)}</h1>
      <p>${escapeHtml(repoManifest.description)}</p>
      <div class="action-bar">
        <a href="${escapeHtml(appDeepLink)}" class="btn btn-primary">📲 Open in CloudStream</a>
        <a href="#how-to-install" class="btn btn-secondary">📖 How to Add</a>
        <a href="https://github.com/phisher98/cloudstream-extensions-phisher/blob/master/docs/WATCH_PARTY_GUIDE.md" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🎉 WatchParty Guide</a>
      </div>
    </header>

    <div class="repo-link-box">
      <label for="repo-url-input">Direct CloudStream Repository URL (repo.json)</label>
      <div class="input-group">
        <input type="text" id="repo-url-input" value="${escapeHtml(repoUrl)}" readonly onclick="this.select()">
        <button type="button" class="btn btn-primary" onclick="copyRepoUrl()">Copy</button>
      </div>
    </div>

    <div class="info-grid" id="how-to-install">
      <div class="info-card">
        <h3>📲 How to Add to CloudStream</h3>
        <ol>
          <li>Open the <strong>CloudStream</strong> app on your Android device or TV.</li>
          <li>Go to <strong>Settings ➔ Extensions ➔ Add Repository</strong>.</li>
          <li>Paste the repository URL above (or tap <em>Open in CloudStream</em> on Android).</li>
          <li>Click <strong>Download / Add</strong> to browse and install extensions.</li>
        </ol>
      </div>
      <div class="info-card">
        <h3>🎉 WatchParty & Ultima Integration</h3>
        <p>This repository bundles Phisher's <strong>WatchParty</strong> and <strong>Ultima</strong> extensions! Only the host needs a free Firebase database; invite friends with 1-click links to sync video playback, send reactions, and chat in real-time.</p>
      </div>
    </div>

    <div class="controls">
      <div class="search-box">
        <input type="search" id="search" placeholder="Search ${plugins.length} extensions by name, author, or description..." autocomplete="off">
      </div>
      <div class="filters">
        <select id="sourceFilter">
          <option value="">All Sources</option>
          ${sources.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select id="typeFilter">
          <option value="">All Content Types</option>
        </select>
      </div>
    </div>

    <div class="grid" id="pluginGrid">
      ${plugins.map(renderPluginCard).join('')}
    </div>

    <footer>
      <p>Curated CloudStream Repository · Updated: ${escapeHtml(updatedAt)} · ${plugins.length} total extensions</p>
      <p>This service indexes public extension manifests. All extension binaries are downloaded from their original author URLs.</p>
    </footer>
  </div>

  <script>
    const plugins = ${JSON.stringify(plugins.map(p => ({
      name: p.name,
      internalName: p.internalName,
      authors: p.authors || [],
      description: p.description || '',
      tvTypes: p.tvTypes || [],
      version: p.version || 1,
      sourceId: p.sourceId || '',
      sourceName: p.sourceName || '',
      language: p.language || '',
      adult: Boolean(p.adult)
    })))};

    function copyRepoUrl() {
      const input = document.getElementById('repo-url-input');
      navigator.clipboard.writeText(input.value).then(() => {
        alert('Repository URL copied to clipboard! Paste it in CloudStream Settings -> Extensions -> Add Repository');
      });
    }

    const searchInput = document.getElementById('search');
    const sourceFilter = document.getElementById('sourceFilter');
    const typeFilter = document.getElementById('typeFilter');
    const grid = document.getElementById('pluginGrid');

    // Populate type filter
    const allTypes = [...new Set(plugins.flatMap(p => p.tvTypes))].filter(Boolean).sort();
    allTypes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeFilter.appendChild(opt);
    });

    function filterPlugins() {
      const q = searchInput.value.toLowerCase().trim();
      const src = sourceFilter.value;
      const type = typeFilter.value;

      const filtered = plugins.filter(p => {
        if (src && p.sourceId !== src) return false;
        if (type && !p.tvTypes.includes(type)) return false;
        if (q) {
          const match = p.name.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        p.authors.some(a => a.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });

      render(filtered);
    }

    function render(list) {
      if (!list.length) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No extensions match your filters.</p>';
        return;
      }
      grid.innerHTML = list.map(p => \`
        <article class="plugin-card">
          <h4>
            <span>\${escapeHtml(p.name)}</span>
            <span class="version-tag">v\${p.version}</span>
          </h4>
          <p class="plugin-desc">\${escapeHtml(p.description || 'No description provided.')}</p>
          <div class="tags">
            \${p.sourceName ? \`<span class="tag tag-source">\${escapeHtml(p.sourceName)}</span>\` : ''}
            \${(p.language && p.language !== 'all') ? \`<span class="tag">\${escapeHtml(p.language.toUpperCase())}</span>\` : ''}
            \${p.tvTypes.slice(0, 3).map(t => \`<span class="tag">\${escapeHtml(t)}</span>\`).join('')}
            \${p.adult ? '<span class="tag tag-adult">NSFW</span>' : ''}
          </div>
        </article>
      \`).join('');
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }

    searchInput.addEventListener('input', filterPlugins);
    sourceFilter.addEventListener('change', filterPlugins);
    typeFilter.addEventListener('change', filterPlugins);
  </script>
</body>
</html>`;
}

function renderPluginCard(p) {
  return `
    <article class="plugin-card">
      <h4>
        <span>${escapeHtml(p.name)}</span>
        <span class="version-tag">v${p.version}</span>
      </h4>
      <p class="plugin-desc">${escapeHtml(p.description || 'No description provided.')}</p>
      <div class="tags">
        ${p.sourceName ? `<span class="tag tag-source">${escapeHtml(p.sourceName)}</span>` : ''}
        ${(p.language && p.language !== 'all') ? `<span class="tag">${escapeHtml(p.language.toUpperCase())}</span>` : ''}
        ${p.tvTypes ? p.tvTypes.slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : ''}
        ${p.adult ? '<span class="tag tag-adult">NSFW</span>' : ''}
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = path.join(ROOT, 'dist');
  const catalogPath = path.join(distDir, 'catalog.json');
  const repoPath = path.join(distDir, 'repo.json');

  if (!fs.existsSync(catalogPath) || !fs.existsSync(repoPath)) {
    console.error('[ERROR] catalog.json or repo.json not found in dist/. Run "npm run build" first.');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const repoManifest = JSON.parse(fs.readFileSync(repoPath, 'utf8'));
  const repoUrl = repoManifest.pluginLists?.[0]?.replace(/plugins\.json$/i, 'repo.json') || 'https://raw.githubusercontent.com/{OWNER}/{REPO}/refs/heads/builds/repo.json';

  const html = generateHtml(catalog, repoManifest, repoUrl);
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  console.log('[SUCCESS] Web landing page generated at dist/index.html');
}

