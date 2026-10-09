import { describe, expect, it } from 'vitest';
import { SETTINGS_LINKS } from './entries';

describe('settings links', () => {
  it('only exposes the implemented privacy destination', () => {
    expect(SETTINGS_LINKS).toEqual([
      {
        href: '/profile/edit',
        label: '资料可见性',
        description: '管理谁可以查看你的资料',
      },
    ]);
  });

  it('uses unique internal destinations with complete copy', () => {
    const hrefs = SETTINGS_LINKS.map((link) => link.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const link of SETTINGS_LINKS) {
      expect(link.href.startsWith('/')).toBe(true);
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.description.length).toBeGreaterThan(0);
    }
  });
});
