import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  applyCollectionRefBindingsToDraft,
  resolveWebMcpMutationData,
  type PageConfig,
  type Section,
} from '@olonjs/core';
import { resolveLocalSectionMutationBase } from './resolveLocalSectionMutationBase';

const authoredSection = {
  id: 'books-list-1',
  type: 'books-list',
  data: {
    title: 'Collections',
    items: { $ref: '../collections/libri/libri.json' },
  },
} as unknown as Section;

const resolvedItems = {
  dune: { id: 'dune', title: 'Dune', author: 'Frank Herbert' },
};

const resolvedPage = {
  id: 'libri-page',
  slug: 'home',
  sections: [
    {
      id: 'books-list-1',
      type: 'books-list',
      data: { title: 'Collections', items: resolvedItems },
    },
  ],
} as unknown as PageConfig;

describe('resolveLocalSectionMutationBase', () => {
  it('uses the resolved section data (collection $ref expanded) when available', () => {
    const base = resolveLocalSectionMutationBase(authoredSection, resolvedPage);
    expect(base.items).toEqual(resolvedItems);
    expect(base.title).toBe('Collections');
  });

  it('falls back to authored data when the resolved page lacks the section', () => {
    const base = resolveLocalSectionMutationBase(authoredSection, {
      ...resolvedPage,
      sections: [],
    } as unknown as PageConfig);
    expect(base.items).toEqual({ $ref: '../collections/libri/libri.json' });
  });

  it('falls back to authored data when no resolved page is given', () => {
    expect(resolveLocalSectionMutationBase(authoredSection, null).title).toBe('Collections');
  });

  it('returns an empty record when neither resolved nor authored data is a record', () => {
    const bare = { id: 'x', type: 'books-list' } as unknown as Section;
    expect(resolveLocalSectionMutationBase(bare, null)).toEqual({});
  });

  it('lets a scalar fieldKey update pass Zod on a section whose authored items is a $ref', () => {
    const LibroSchema = z.object({ id: z.string(), title: z.string(), author: z.string() });
    const BooksListSchema = z.object({
      title: z.string(),
      items: z.record(z.string(), LibroSchema),
    });

    const base = resolveLocalSectionMutationBase(authoredSection, resolvedPage);
    const nextData = resolveWebMcpMutationData(base, {
      sectionId: 'books-list-1',
      fieldKey: 'title',
      value: 'Catalogo',
    });

    const parsed = BooksListSchema.parse(nextData);
    expect(parsed.title).toBe('Catalogo');

    const result = applyCollectionRefBindingsToDraft(
      authoredSection.data,
      parsed,
      { libri: resolvedItems },
      undefined,
      { libri: z.record(z.string(), LibroSchema) } as never
    );

    expect(result.normalizedData.title).toBe('Catalogo');
    expect(result.normalizedData.items).toEqual({ $ref: '../collections/libri/libri.json' });
    expect(result.collectionsDraft?.libri).toEqual(resolvedItems);
  });

  it('documents the bug: parsing the authored $ref base fails on items.$ref', () => {
    const BooksListSchema = z.object({
      title: z.string(),
      items: z.record(z.string(), z.object({ id: z.string() })),
    });
    const authoredBase = authoredSection.data as Record<string, unknown>;
    const nextData = resolveWebMcpMutationData(authoredBase, {
      sectionId: 'books-list-1',
      fieldKey: 'title',
      value: 'Catalogo',
    });
    expect(() => BooksListSchema.parse(nextData)).toThrow();
  });
});
