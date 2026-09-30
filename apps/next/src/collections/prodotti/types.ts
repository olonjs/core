import { z } from 'zod';
import { ProdottoSchema, ProdottiCollectionSchema } from './schema';

export type Prodotto = z.infer<typeof ProdottoSchema>;
export type ProdottiCollection = z.infer<typeof ProdottiCollectionSchema>;
