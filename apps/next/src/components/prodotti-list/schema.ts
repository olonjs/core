import { z } from 'zod';
import { BaseSectionData } from '@olonjs/core';
import { ProdottoSchema } from '@/collections/prodotti';

export const ProdottiListSchema = BaseSectionData.extend({
  eyebrow: z.string().optional().describe('ui:text'),
  title: z.string().describe('ui:text'),
  description: z.string().optional().describe('ui:textarea'),
  items: z.record(z.string(), ProdottoSchema).describe('ui:collection-ref:catalogo'),
});

export const ProdottiListSettingsSchema = z.object({});
