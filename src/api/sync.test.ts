import { describe, expect, it } from 'vitest';
import { mergePrefs } from './sync';
import type { PrefsPayload } from './prefs';
import { initialCfg } from '../board/model';

const base = (over: Partial<PrefsPayload>): PrefsPayload => ({
  cfg: initialCfg,
  integrations: { ytrack: true, email: true },
  autoSync: true,
  twoWay: true,
  guestLinks: true,
  mappingRules: [],
  userOverrides: {},
  invites: [],
  customCols: [],
  colValues: {},
  colLabels: {},
  labels: { status: [], priority: [], type: [], source: [] },
  version: 0,
  ...over,
});

describe('mergePrefs (cross-tab conflict resolution)', () => {
  it('keeps the slice THIS tab changed and takes the server for untouched slices', () => {
    const sharedLabels = {
      status: [{ key: 'done', label: 'Готово', bg: '#000' }],
      priority: [],
      type: [],
      source: [],
    };
    const baseline = base({ labels: sharedLabels, autoSync: true, version: 5 });
    // Local: same refs as baseline EXCEPT labels was edited (new ref) → labels dirty, autoSync not.
    const localLabels = {
      ...sharedLabels,
      status: [{ key: 'done', label: 'Завершено', bg: '#000' }],
    };
    const local = { ...baseline, labels: localLabels };
    // Server: another tab flipped autoSync + bumped the version; its labels are still the old ref.
    const server = base({ labels: sharedLabels, autoSync: false, version: 6 });

    const merged = mergePrefs(baseline, local, server);

    expect(merged.labels).toBe(localLabels); // this tab's edit preserved
    expect(merged.autoSync).toBe(false); // the other tab's edit preserved
    expect(merged.version).toBe(6); // retry uses the server's current version
  });

  it('with no baseline, every slice is treated as locally dirty (local wins)', () => {
    const local = base({ autoSync: true, version: 1 });
    const server = base({ autoSync: false, version: 9 });
    const merged = mergePrefs(null, local, server);
    expect(merged.autoSync).toBe(true); // local wins
    expect(merged.version).toBe(9); // but still carries the server version
  });
});
