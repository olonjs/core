/**
 * Golden tests for the hand-rolled Zod -> JSON Schema serializer on Zod v4.
 *
 * The serializer (webmcp-contracts.ts) was migrated from v3 internals
 * (`_def.typeName` + `z.ZodFirstPartyTypeKind`, `_def.defaultValue()`,
 * `_def.shape()`, `_def.checks[].kind`) to v4 internals (`_def.type`,
 * `_def.defaultValue` value, `_def.shape` plain map, `_def.entries`,
 * `_def.values`, `_def.element`, number_format/safeint checks).
 *
 * These assertions pin the EXACT JSON Schema output so the public contract
 * (WebMCP manifests, collection contracts) cannot silently change shape.
 * The public seams under test are `buildCollectionContract` (single schema)
 * and `buildPageContract` (section schemas by type).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildCollectionContract, buildPageContract } from './webmcp-contracts';
import type { PageConfig, SiteConfig } from './kernel';

function itemSchemaOf(schema: z.ZodTypeAny): Record<string, unknown> {
  const contract = buildCollectionContract({ source: 'probe', schema });
  return contract.itemSchema as Record<string, unknown>;
}

const emptySite = { identity: { title: 'Probe' }, footer: {} as never } as SiteConfig;

describe('zod v4 serializer — golden shapes', () => {
  it('serializes an object with required and optional fields', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string().optional(),
    });
    expect(itemSchemaOf(schema)).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      additionalProperties: false,
      required: ['id'],
    });
  });

  it('emits defaults as values and treats them as optional (v4: _def.defaultValue is a value)', () => {
    const schema = z.object({
      theme: z.enum(['dark', 'light']).default('dark'),
      greeting: z.string().default('hello'),
    });
    const item = itemSchemaOf(schema);
    const props = item.properties as Record<string, Record<string, unknown>>;
    expect(item.required).toBeUndefined();
    expect(props.theme).toEqual({
      type: 'string',
      enum: ['dark', 'light'],
      default: 'dark',
    });
    expect(props.greeting).toEqual({
      type: 'string',
      default: 'hello',
    });
  });

  it('wraps nullable fields in anyOf with null (v4: unwrap via _def.type nullable)', () => {
    const schema = z.object({
      nickname: z.string().nullable(),
    });
    const props = itemSchemaOf(schema).properties as Record<string, unknown>;
    expect(props.nickname).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });

  it('serializes enums via _def.entries (v4 record shape)', () => {
    expect(itemSchemaOf(z.enum(['dark', 'light', 'accent']))).toEqual({
      type: 'string',
      enum: ['dark', 'light', 'accent'],
    });
  });

  it('serializes literals via _def.values (v4 single-element array)', () => {
    expect(itemSchemaOf(z.literal('vip'))).toEqual({
      const: 'vip',
      type: 'string',
    });
    expect(itemSchemaOf(z.literal(42))).toEqual({
      const: 42,
      type: 'number',
    });
  });

  it('collapses literal unions into a string enum', () => {
    const schema = z.union([z.literal('a'), z.literal('b'), z.literal('c')]);
    expect(itemSchemaOf(schema)).toEqual({
      type: 'string',
      enum: ['a', 'b', 'c'],
    });
  });

  it('emits anyOf for non-enum unions', () => {
    const schema = z.union([z.string(), z.number()]);
    expect(itemSchemaOf(schema)).toEqual({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
  });

  it('serializes arrays via _def.element (v4 rename from _def.type)', () => {
    const schema = z.array(z.object({ id: z.string() }));
    expect(itemSchemaOf(schema)).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' } },
        additionalProperties: false,
        required: ['id'],
      },
    });
  });

  it('emits integer for .int() via number_format/safeint checks, number otherwise', () => {
    expect(itemSchemaOf(z.number().int())).toEqual({ type: 'integer' });
    expect(itemSchemaOf(z.number())).toEqual({ type: 'number' });
  });

  it('serializes nested records via _def.valueType', () => {
    const schema = z.object({
      items: z.record(z.string(), z.object({ id: z.string() })),
    });
    const props = itemSchemaOf(schema).properties as Record<string, unknown>;
    expect(props.items).toEqual({
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: { id: { type: 'string' } },
        additionalProperties: false,
        required: ['id'],
      },
    });
  });
});

describe('zod v4 serializer — page contract integration', () => {
  it('emits sectionSchemas keyed by section type on the page', () => {
    const pageConfig = {
      id: 'p1',
      slug: 'home',
      meta: { title: 'Home', description: '' },
      sections: [{ id: 'hero-1', type: 'hero', data: {} }],
    } as unknown as PageConfig;

    const contract = buildPageContract({
      slug: 'home',
      pageConfig,
      schemas: {
        hero: z.object({
          title: z.string(),
          subtitle: z.string().optional(),
        }),
      },
      siteConfig: emptySite,
    });

    expect(contract.sectionSchemas).toEqual({
      hero: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          subtitle: { type: 'string' },
        },
        additionalProperties: false,
        required: ['title'],
      },
    });
  });
});
