import { AutoriCollectionSchema } from '@/collections/autori';
import { LibriCollectionSchema } from '@/collections/libri';
import { ProdottiCollectionSchema } from '@/collections/prodotti';

export const CollectionRegistry = {
  autori: AutoriCollectionSchema,
  libri: LibriCollectionSchema,
  catalogo: ProdottiCollectionSchema,
} as const;

export type CollectionType = keyof typeof CollectionRegistry;
