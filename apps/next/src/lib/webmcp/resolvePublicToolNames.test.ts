import { describe, expect, it } from 'vitest';
import { resolvePublicToolNames } from './resolvePublicToolNames';

const sectionPublicTools = {
  'form-demo': ['submit-form'],
  'shop-catalog': ['search-product', 'add-to-cart'],
};

describe('resolvePublicToolNames', () => {
  it('returns the public tools of the sections present on the page, deduplicated, in page order', () => {
    const sections = [
      { type: 'form-demo' },
      { type: 'hero' },
      { type: 'form-demo' },
      { type: 'shop-catalog' },
    ];
    expect(resolvePublicToolNames(sections, sectionPublicTools)).toEqual([
      'submit-form',
      'search-product',
      'add-to-cart',
    ]);
  });

  it('returns an empty list when no section declares tools', () => {
    expect(resolvePublicToolNames([{ type: 'hero' }], sectionPublicTools)).toEqual([]);
  });

  it('returns an empty list for an empty page', () => {
    expect(resolvePublicToolNames([], sectionPublicTools)).toEqual([]);
  });

  it('ignores tool names not present in the section map', () => {
    expect(resolvePublicToolNames([{ type: 'footer' }], sectionPublicTools)).toEqual([]);
  });
});
