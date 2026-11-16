import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUEST_TIMEOUT_MS = 15000;

export function isAdult(plugin) {
  return Array.isArray(plugin.tvTypes) && plugin.tvTypes.some(v => typeof v === 'string' && v.trim().toUpperCase() === 'NSFW');
}

export function resolveUrl(relativeOrAbsolute, base) {
  try {
    return new URL(relativeOrAbsolute, base).href;
  } catch {
    return relativeOrAbsolute;
  }
}

export function normalizePlugin(entry, source, baseUrl) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

  const internalName = typeof entry.internalName === 'string' ? entry.internalName.trim() : '';
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!internalName || !name) return null;

  let url = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (!url) return null;

  // Resolve relative URLs (e.g. "SuperStream.cs3" -> full HTTPS URL)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = resolveUrl(url, baseUrl);
  }

  // CloudStream requires HTTPS for secure distribution
  if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }

  if (!url.startsWith('https://') || !/\.cs3(?:[?#]|$)/i.test(url)) {
    return null;
  }

  const version = Number.isInteger(entry.version) && entry.version >= 1 ? entry.version : 1;
  const apiVersion = Number.isInteger(entry.apiVersion) ? entry.apiVersion : 1;
  const status = Number.isInteger(entry.status) && entry.status >= 0 && entry.status <= 3 ? entry.status : 1;

  const authors = Array.isArray(entry.authors)
    ? entry.authors.map(a => String(a).trim()).filter(Boolean)
    : (typeof entry.authors === 'string' && entry.authors.trim() ? [entry.authors.trim()] : ['Unknown']);

  const tvTypes = Array.isArray(entry.tvTypes)
    ? entry.tvTypes.map(t => String(t).trim()).filter(Boolean)
    : [];

  const language = typeof entry.language === 'string' ? entry.language.trim().toLowerCase() : 'all';
  const description = typeof entry.description === 'string' ? entry.description.trim() : '';

  let iconUrl = typeof entry.iconUrl === 'string' ? entry.iconUrl.trim() : undefined;
  if (iconUrl && !iconUrl.startsWith('http://') && !iconUrl.startsWith('https://')) {
    iconUrl = resolveUrl(iconUrl, baseUrl);
  }

  const result = {
    name,
    internalName,
    description,
    authors,
    version,
    apiVersion,
    status,
    url,
    language,
    tvTypes
  };

  if (iconUrl) result.iconUrl = iconUrl;
  if (typeof entry.fileHash === 'string' && entry.fileHash.trim()) result.fileHash = entry.fileHash.trim();
  if (Number.isInteger(entry.fileSize) && entry.fileSize > 0) result.fileSize = entry.fileSize;
  if (typeof entry.repositoryUrl === 'string' && entry.repositoryUrl.trim()) result.repositoryUrl = entry.repositoryUrl.trim();

  // Attach internal aggregation metadata
  result._meta = {
    sourceId: source.id,
    sourceName: source.name,
    sourcePriority: source.priority || 50,
    adult: isAdult(result)
  };

  return result;
}

export async function fetchSource(source, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetcher(source.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CloudStream-Custom-Repo-Aggregator/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const plugins = [];

    if (source.type === 'repo_manifest') {
      const lists = Array.isArray(json.pluginLists) ? json.pluginLists : [];
      for (const listUrl of lists) {
        try {
          const listRes = await fetcher(listUrl, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json', 'User-Agent': 'CloudStream-Custom-Repo-Aggregator/1.0' }
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData)) {
              for (const entry of listData) {
                const norm = normalizePlugin(entry, source, listUrl);
                if (norm) plugins.push(norm);
              }
            }
          }
        } catch (err) {
          console.warn(`[WARN] Failed to fetch sub-list ${listUrl} from source ${source.id}: ${err.message}`);
        }
      }
    } else {
      if (Array.isArray(json)) {
        for (const entry of json) {
          const norm = normalizePlugin(entry, source, source.url);
          if (norm) plugins.push(norm);
        }
      }
    }

    return plugins;
  } finally {
    clearTimeout(timer);
  }
}

export function deduplicatePlugins(rawPlugins, preferredPlugins = {}) {
  const map = new Map();

  for (const plugin of rawPlugins) {
    const key = plugin.internalName;
    if (!map.has(key)) {
      map.set(key, plugin);
      continue;
    }

    const existing = map.get(key);
    const preferredSource = preferredPlugins[key];

    // Rule 0: Specific preferred source override
    if (preferredSource) {
      if (plugin._meta?.sourceId === preferredSource && existing._meta?.sourceId !== preferredSource) {
        map.set(key, plugin);
        continue;
      }
      if (existing._meta?.sourceId === preferredSource && plugin._meta?.sourceId !== preferredSource) {
        continue;
      }
    }

    // Rule 1: Always prefer a working plugin (status !== 0) over a broken one (status === 0)
    if (existing.status === 0 && plugin.status !== 0) {
      map.set(key, plugin);
      continue;
    }
    if (existing.status !== 0 && plugin.status === 0) {
      continue;
    }

    // Rule 2: Prefer higher version number
    if (plugin.version > existing.version) {
      map.set(key, plugin);
      continue;
    }
    if (plugin.version < existing.version) {
      continue;
    }

    // Rule 3: If versions match, prefer higher source priority
    const pluginPri = plugin._meta?.sourcePriority || 0;
    const existingPri = existing._meta?.sourcePriority || 0;
    if (pluginPri > existingPri) {
      map.set(key, plugin);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterPlugins(plugins, filter = {}) {
  const { excludeNsfw = false, excludeDown = true, whitelist = [], blacklist = [] } = filter;
  const wlSet = new Set(whitelist);
  const blSet = new Set(blacklist);

  return plugins.filter(p => {
    if (excludeDown && p.status === 0) return false;
    if (excludeNsfw && isAdult(p)) return false;
    if (blSet.has(p.internalName)) return false;
    if (wlSet.size > 0 && !wlSet.has(p.internalName)) return false;
    return true;
  });
}

export function makeManifest(repoConfig, pluginsUrl) {
  const manifest = {
    name: repoConfig.name || 'CloudStream Custom Repository',
    description: repoConfig.description || 'Custom extension repository',
    manifestVersion: repoConfig.manifestVersion || 1,
    pluginLists: [pluginsUrl]
  };

  if (repoConfig.iconUrl) {
    manifest.iconUrl = repoConfig.iconUrl;
  }

  return manifest;
}

export async function aggregateAll(sourcesConfig, repoConfig, options = {}) {
  const { fetcher = fetch, baseUrl = process.env.REPO_BASE_URL || '' } = options;
  const sources = sourcesConfig.sources || [];
  const filter = sourcesConfig.filter || {};
  const preferredPlugins = sourcesConfig.preferredPlugins || {};

  const allRawPlugins = [];
  const sourceStats = [];

  for (const source of sources) {
    if (source.enabled === false) {
      sourceStats.push({ id: source.id, name: source.name, status: 'disabled', count: 0 });
      continue;
    }

    console.log(`[SYNC] Fetching ${source.name} (${source.url})...`);
    try {
      const plugins = await fetchSource(source, fetcher);
      allRawPlugins.push(...plugins);
      sourceStats.push({ id: source.id, name: source.name, status: 'ok', count: plugins.length });
      console.log(`[SYNC]   ✓ Fetched ${plugins.length} valid plugins from ${source.id}`);
    } catch (err) {
      console.error(`[SYNC]   ✗ Failed to fetch ${source.id}: ${err.message}`);
      sourceStats.push({ id: source.id, name: source.name, status: 'error', error: err.message, count: 0 });
    }
  }

  const deduplicated = deduplicatePlugins(allRawPlugins, preferredPlugins);
  const finalPlugins = filterPlugins(deduplicated, filter);

  // Clean _meta before writing the official CloudStream plugins.json
  const cleanPlugins = finalPlugins.map(p => {
    const copy = { ...p };
    delete copy._meta;
    return copy;
  });

  // Determine plugins.json URL
  const resolvedBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://raw.githubusercontent.com/{OWNER}/{REPO}/refs/heads/builds';
  const pluginsUrl = `${resolvedBaseUrl}/${repoConfig.pluginListPath || 'plugins.json'}`;
  const manifest = makeManifest(repoConfig, pluginsUrl);

  const catalog = {
    updatedAt: new Date().toISOString(),
    name: repoConfig.name,
    totalPlugins: cleanPlugins.length,
    sources: sourceStats,
    plugins: finalPlugins.map(p => ({
      name: p.name,
      internalName: p.internalName,
      description: p.description,
      version: p.version,
      authors: p.authors,
      tvTypes: p.tvTypes,
      language: p.language,
      status: p.status,
      iconUrl: p.iconUrl,
      sourceId: p._meta?.sourceId,
      sourceName: p._meta?.sourceName,
      adult: p._meta?.adult
    }))
  };

  return {
    manifest,
    plugins: cleanPlugins,
    catalog,
    stats: {
      rawTotal: allRawPlugins.length,
      dedupedTotal: deduplicated.length,
      finalTotal: cleanPlugins.length,
      sourceStats
    }
  };
}

// Run CLI when invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      const sourcesPath = path.join(ROOT, 'config', 'sources.json');
      const repoPath = path.join(ROOT, 'config', 'repository.json');

      const sourcesConfig = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
      const repoConfig = JSON.parse(fs.readFileSync(repoPath, 'utf8'));

      const result = await aggregateAll(sourcesConfig, repoConfig);

      const distDir = path.join(ROOT, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      fs.writeFileSync(path.join(distDir, 'repo.json'), JSON.stringify(result.manifest, null, 2));
      fs.writeFileSync(path.join(distDir, 'plugins.json'), JSON.stringify(result.plugins, null, 2));
      fs.writeFileSync(path.join(distDir, 'catalog.json'), JSON.stringify(result.catalog, null, 2));

      console.log('\n=============================================');
      console.log(`[SUCCESS] Aggregated ${result.stats.finalTotal} plugins.`);
      console.log(`- Raw collected: ${result.stats.rawTotal}`);
      console.log(`- Unique plugins: ${result.stats.dedupedTotal}`);
      console.log(`- Dist outputs generated in: ${distDir}`);
      console.log('=============================================\n');
    } catch (err) {
      console.error('[FATAL] Aggregation failed:', err);
      process.exit(1);
    }
  })();
}
