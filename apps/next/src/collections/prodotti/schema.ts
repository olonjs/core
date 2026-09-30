import { z } from 'zod';
import { BaseCollectionItem } from '@olonjs/core';

/**
 * Demo collection whose source of truth is EXTERNAL (see src/sources/catalogo.ts).
 * Same Zod item shape feeds the human list rendering (ui:* descriptors) and the
 * agent contracts (JSON Schema emitted from this schema).
 */
export const ProdottoSchema = BaseCollectionItem.extend({
  title: z.string().describe('ui:text'),
  price: z.number().describe('ui:number'),
  currency: z.string().default('EUR').describe('ui:text'),
  description: z.string().optional().describe('ui:textarea'),
  image: z.string().optional().describe('ui:text'),
});

export const ProdottiCollectionSchema = z.record(z.string(), ProdottoSchema);
