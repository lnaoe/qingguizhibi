import { describe, expect, it } from 'vitest';
import { ME_SECTIONS } from './entries';

describe('me sections', () => {
  it('exposes the four F01 destinations in order', () => {
    expect(ME_SECTIONS.map((section) => section.label)).toEqual([
      '我的资料',
      '我的笔友',
      '通知',
      '设置',
    ]);
    expect(ME_SECTIONS.map((section) => section.href)).toEqual([
      '/profile',
      '/relationships',
      '/notifications',
      '/settings',
    ]);
  });

  it('has unique internal hrefs and a description for every entry', () => {
    const hrefs = ME_SECTIONS.map((section) => section.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const section of ME_SECTIONS) {
      expect(section.href.startsWith('/')).toBe(true);
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(0);
    }
  });
});
