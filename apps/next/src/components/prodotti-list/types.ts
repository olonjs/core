import type { z } from 'zod';
import type { ProdottiListSchema, ProdottiListSettingsSchema } from './schema';

export type ProdottiListData = z.infer<typeof ProdottiListSchema>;
export type ProdottiListSettings = z.infer<typeof ProdottiListSettingsSchema>;
