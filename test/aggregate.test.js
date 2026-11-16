import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdult,
  resolveUrl,
  normalizePlugin,
  deduplicatePlugins,
  filterPlugins,
  makeManifest,
  aggregateAll
} from '../scripts/aggregate.js';

test('isAdult correctly identifies NSFW content in tvTypes', () => {
  assert.equal(isAdult({ tvTypes: ['Movie', 'NSFW'] }), true);
  assert.equal(isAdult({ tvTypes: ['nsfw'] }), true);
  assert.equal(isAdult({ tvTypes: ['Movie', 'Anime'] }), false);
  assert.equal(isAdult({}), false);
});

test('resolveUrl resolves relative paths against a base URL', () => {
  assert.equal(resolveUrl('plugin.cs3', 'https://example.com/builds/plugins.json'), 'https://example.com/builds/plugin.cs3');
  assert.equal(resolveUrl('https://other.com/plugin.cs3', 'https://example.com/'), 'https://other.com/plugin.cs3');
});

test('normalizePlugin validates and normalizes plugins with relative and absolute URLs', () => {
  const source = { id: 'test_source', name: 'Test Source', priority: 50 };
  const base = 'https://example.org/builds/plugins.json';

  const validEntry = {
    name: 'SuperStream',
    internalName: 'SuperStream',
    url: 'SuperStream.cs3',
    version: 12,
    apiVersion: 1,
    status: 1,
    authors: ['DevA'],
    tvTypes: ['Movie'],
    language: 'en',
    description: 'High quality movie provider'
  };

  const normalized = normalizePlugin(validEntry, source, base);
  assert.ok(normalized);
  assert.equal(normalized.name, 'SuperStream');
  assert.equal(normalized.internalName, 'SuperStream');
  assert.equal(normalized.url, 'https://example.org/builds/SuperStream.cs3');
  assert.equal(normalized.version, 12);
  assert.equal(normalized._meta.sourceId, 'test_source');

  // Rejects invalid entry without internalName or name
  assert.equal(normalizePlugin({ url: 'test.cs3' }, source, base), null);
  // Rejects invalid URL
  assert.equal(normalizePlugin({ name: 'A', internalName: 'A', url: 'invalid.txt' }, source, base), null);
});

test('deduplicatePlugins resolves collisions with version and priority rules', () => {
  const p1_v1 = {
    name: 'CineStream',
    internalName: 'CineStream',
    version: 1,
    status: 1,
    url: 'https://example.org/p1.cs3',
    _meta: { sourceId: 'srcA', sourcePriority: 80 }
  };
  const p1_v2 = {
    name: 'CineStream',
    internalName: 'CineStream',
    version: 2,
    status: 1,
    url: 'https://example.org/p2.cs3',
    _meta: { sourceId: 'srcB', sourcePriority: 80 }
  };

  // Higher version wins
  const deduped1 = deduplicatePlugins([p1_v1, p1_v2]);
  assert.equal(deduped1.length, 1);
  assert.equal(deduped1[0].version, 2);

  // Equal versions -> higher priority wins
  const p2_lowPri = {
    name: 'VegaMovies',
    internalName: 'VegaMovies',
    version: 5,
    status: 1,
    url: 'https://example.org/vega_low.cs3',
    _meta: { sourceId: 'low', sourcePriority: 70 }
  };
  const p2_highPri = {
    name: 'VegaMovies',
    internalName: 'VegaMovies',
    version: 5,
    status: 1,
    url: 'https://example.org/vega_high.cs3',
    _meta: { sourceId: 'high', sourcePriority: 100 }
  };

  const deduped2 = deduplicatePlugins([p2_lowPri, p2_highPri]);
  assert.equal(deduped2.length, 1);
  assert.equal(deduped2[0].url, 'https://example.org/vega_high.cs3');

  // Working plugin (status: 1) wins over broken plugin (status: 0) even with higher version
  const p3_broken = {
    name: 'Bollyflix',
    internalName: 'Bollyflix',
    version: 10,
    status: 0,
    url: 'https://example.org/broken.cs3',
    _meta: { sourceId: 'b', sourcePriority: 90 }
  };
  const p3_working = {
    name: 'Bollyflix',
    internalName: 'Bollyflix',
    version: 8,
    status: 1,
    url: 'https://example.org/working.cs3',
    _meta: { sourceId: 'w', sourcePriority: 90 }
  };

  const deduped3 = deduplicatePlugins([p3_broken, p3_working]);
  assert.equal(deduped3.length, 1);
  assert.equal(deduped3[0].status, 1);
  assert.equal(deduped3[0].version, 8);

  // Preferred source rule overrides higher version
  const p4_phisher = {
    name: 'WatchParty',
    internalName: 'WatchParty',
    version: 2,
    status: 1,
    url: 'https://example.org/phisher_wp.cs3',
    _meta: { sourceId: 'phisher', sourcePriority: 100 }
  };
  const p4_other = {
    name: 'WatchParty',
    internalName: 'WatchParty',
    version: 5,
    status: 1,
    url: 'https://example.org/other_wp.cs3',
    _meta: { sourceId: 'other', sourcePriority: 90 }
  };

  const deduped4 = deduplicatePlugins([p4_other, p4_phisher], { WatchParty: 'phisher' });
  assert.equal(deduped4.length, 1);
  assert.equal(deduped4[0].url, 'https://example.org/phisher_wp.cs3');
  assert.equal(deduped4[0].version, 2);
});

test('filterPlugins handles exclusion of down, NSFW, and blacklists/whitelists', () => {
  const plugins = [
    { name: 'Normal', internalName: 'Normal', status: 1, tvTypes: ['Movie'] },
    { name: 'Down', internalName: 'Down', status: 0, tvTypes: ['Movie'] },
    { name: 'Adult', internalName: 'Adult', status: 1, tvTypes: ['NSFW'] },
    { name: 'Custom', internalName: 'Custom', status: 1, tvTypes: ['Anime'] }
  ];

  // Exclude down
  const noDown = filterPlugins(plugins, { excludeDown: true });
  assert.deepEqual(noDown.map(p => p.internalName), ['Normal', 'Adult', 'Custom']);

  // Exclude NSFW
  const noAdult = filterPlugins(plugins, { excludeDown: false, excludeNsfw: true });
  assert.deepEqual(noAdult.map(p => p.internalName), ['Normal', 'Down', 'Custom']);

  // Whitelist
  const onlyCustom = filterPlugins(plugins, { whitelist: ['Custom'] });
  assert.deepEqual(onlyCustom.map(p => p.internalName), ['Custom']);

  // Blacklist
  const noCustom = filterPlugins(plugins, { blacklist: ['Custom'], excludeDown: false });
  assert.deepEqual(noCustom.map(p => p.internalName), ['Normal', 'Down', 'Adult']);
});

test('makeManifest formats correct CloudStream repository manifest', () => {
  const repo = {
    name: 'My Repo',
    description: 'My Description',
    manifestVersion: 1,
    iconUrl: 'https://example.com/icon.png'
  };
  const manifest = makeManifest(repo, 'https://example.com/plugins.json');
  assert.equal(manifest.name, 'My Repo');
  assert.equal(manifest.description, 'My Description');
  assert.equal(manifest.manifestVersion, 1);
  assert.deepEqual(manifest.pluginLists, ['https://example.com/plugins.json']);
  assert.equal(manifest.iconUrl, 'https://example.com/icon.png');
});

test('aggregateAll successfully aggregates from multiple mocked sources', async () => {
  const mockSourcesConfig = {
    sources: [
      {
        id: 'phisher',
        name: 'Phisher Source',
        url: 'https://mock.phisher.com/plugins.json',
        type: 'plugins_array',
        priority: 100,
        enabled: true
      },
      {
        id: 'megarepo',
        name: 'MegaRepo Source',
        url: 'https://mock.megarepo.com/plugins.json',
        type: 'plugins_array',
        priority: 90,
        enabled: true
      }
    ],
    preferredPlugins: {
      WatchParty: 'phisher'
    },
    filter: {
      excludeDown: true,
      excludeNsfw: false
    }
  };

  const mockRepoConfig = {
    name: 'Test Aggregated Repo',
    description: 'Testing',
    manifestVersion: 1,
    pluginListPath: 'plugins.json'
  };

  const mockFetcher = async (url) => {
    if (url === 'https://mock.phisher.com/plugins.json') {
      return new Response(JSON.stringify([
        {
          name: 'WatchParty',
          internalName: 'WatchParty',
          version: 2,
          status: 1,
          url: 'https://mock.phisher.com/WatchParty.cs3',
          authors: ['Phisher98']
        },
        {
          name: 'CineStream',
          internalName: 'CineStream',
          version: 5,
          status: 1,
          url: 'https://mock.phisher.com/CineStream.cs3',
          authors: ['Phisher98']
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (url === 'https://mock.megarepo.com/plugins.json') {
      return new Response(JSON.stringify([
        {
          name: 'CineStream Old',
          internalName: 'CineStream',
          version: 4,
          status: 1,
          url: 'https://mock.megarepo.com/CineStreamOld.cs3',
          authors: ['Other']
        },
        {
          name: 'WatchParty Fork',
          internalName: 'WatchParty',
          version: 99,
          status: 1,
          url: 'https://mock.megarepo.com/WatchPartyFork.cs3',
          authors: ['MegaRepo']
        },
        {
          name: 'SuperStream',
          internalName: 'SuperStream',
          version: 10,
          status: 1,
          url: 'https://mock.megarepo.com/SuperStream.cs3',
          authors: ['MegaRepo']
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const result = await aggregateAll(mockSourcesConfig, mockRepoConfig, {
    fetcher: mockFetcher,
    baseUrl: 'https://cdn.myrepo.com'
  });

  assert.equal(result.plugins.length, 3);
  assert.deepEqual(result.plugins.map(p => p.internalName).sort(), ['CineStream', 'SuperStream', 'WatchParty']);

  // Ensure CineStream v5 from Phisher won over v4 from MegaRepo
  const cine = result.plugins.find(p => p.internalName === 'CineStream');
  assert.equal(cine.version, 5);
  assert.equal(cine.url, 'https://mock.phisher.com/CineStream.cs3');

  // Ensure Phisher WatchParty won due to preferredPlugins despite v99 in MegaRepo
  const wp = result.plugins.find(p => p.internalName === 'WatchParty');
  assert.equal(wp.version, 2);
  assert.equal(wp.url, 'https://mock.phisher.com/WatchParty.cs3');

  // Verify manifest
  assert.equal(result.manifest.name, 'Test Aggregated Repo');
  assert.deepEqual(result.manifest.pluginLists, ['https://cdn.myrepo.com/plugins.json']);
});
