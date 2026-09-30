import type { z } from 'zod';
import type { ProdottoDetailSchema, ProdottoDetailSettingsSchema } from './schema';

export type ProdottoDetailData = z.infer<typeof ProdottoDetailSchema>;
export type ProdottoDetailSettings = z.infer<typeof ProdottoDetailSettingsSchema>;
