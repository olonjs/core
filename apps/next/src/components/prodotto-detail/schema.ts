import { z } from 'zod';
import { BaseSectionData } from '@olonjs/core';
import { ProdottoSchema } from '@/collections/prodotti';

export const ProdottoDetailSchema = BaseSectionData.extend({
  item: ProdottoSchema.describe('ui:collection-ref'),
  backLabel: z.string().default('Torna al catalogo').describe('ui:text'),
});

export const ProdottoDetailSettingsSchema = z.object({});
