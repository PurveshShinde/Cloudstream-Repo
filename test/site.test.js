import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHtml } from '../scripts/generate-site.js';

test('generateHtml outputs valid HTML with escaped metadata and deep links', () => {
  const mockCatalog = {
    updatedAt: '2026-11-17T00:00:00.000Z',
    sources: [{ id: 'phisher', name: 'Phisher Source' }],
    plugins: [
      {
        name: 'WatchParty <Special>',
        internalName: 'WatchParty',
        description: 'Synchronized & Real-time playback',
        authors: ['Phisher98'],
        tvTypes: ['All'],
        version: 2,
        sourceId: 'phisher',
        sourceName: 'Phisher Source',
        adult: false
      }
    ]
  };

  const mockRepo = {
    name: 'Custom CloudStream Repo',
    description: 'Testing Description',
    manifestVersion: 1
  };

  const repoUrl = 'https://raw.githubusercontent.com/user/repo/refs/heads/builds/repo.json';
  const html = generateHtml(mockCatalog, mockRepo, repoUrl);

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Custom CloudStream Repo/);
  assert.match(html, /cloudstreamrepo:\/\/raw\.githubusercontent\.com\/user\/repo\/refs\/heads\/builds\/repo\.json/);
  assert.match(html, /WatchParty &lt;Special&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

