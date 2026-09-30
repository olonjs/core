import type { AuthorsListData, AuthorsListSettings } from '@/components/authors-list';
import type { BookDetailData, BookDetailSettings } from '@/components/book-detail';
import type { BooksListData, BooksListSettings } from '@/components/books-list';
import type { EmptyTenantData, EmptyTenantSettings } from '@/components/empty-tenant';
import type { FooterData, FooterSettings } from '@/components/footer';
import type { FormDemoData, FormDemoSettings } from '@/components/form-demo';
import type { HeaderData, HeaderSettings } from '@/components/header';
import type { ProdottoDetailData, ProdottoDetailSettings } from '@/components/prodotto-detail';
import type { ProdottiListData, ProdottiListSettings } from '@/components/prodotti-list';
import type { Autore } from '@/collections/autori';
import type { Libro } from '@/collections/libri';
import type { Prodotto } from '@/collections/prodotti';

export type SectionComponentPropsMap = {
  'authors-list': { data: AuthorsListData; settings?: AuthorsListSettings };
  'book-detail': { data: BookDetailData; settings?: BookDetailSettings };
  'books-list': { data: BooksListData; settings?: BooksListSettings };
  'empty-tenant': { data?: EmptyTenantData; settings?: EmptyTenantSettings };
  footer: { data: FooterData; settings?: FooterSettings };
  header: { data: HeaderData; settings?: HeaderSettings };
  'form-demo': { data: FormDemoData; settings?: FormDemoSettings };
  'prodotti-list': { data: ProdottiListData; settings?: ProdottiListSettings };
  'prodotto-detail': { data: ProdottoDetailData; settings?: ProdottoDetailSettings };
};

declare module '@olonjs/core' {
  export interface SectionDataRegistry {
    'authors-list': AuthorsListData;
    'book-detail': BookDetailData;
    'books-list': BooksListData;
    'empty-tenant': EmptyTenantData;
    footer: FooterData;
    header: HeaderData;
    'form-demo': FormDemoData;
    'prodotti-list': ProdottiListData;
    'prodotto-detail': ProdottoDetailData;
  }
  export interface SectionSettingsRegistry {
    'authors-list': AuthorsListSettings;
    'book-detail': BookDetailSettings;
    'books-list': BooksListSettings;
    'empty-tenant': EmptyTenantSettings;
    footer: FooterSettings;
    header: HeaderSettings;
    'form-demo': FormDemoSettings;
    'prodotti-list': ProdottiListSettings;
    'prodotto-detail': ProdottoDetailSettings;
  }
  export interface CollectionItemRegistry {
    autori: Autore;
    libri: Libro;
    prodotti: Prodotto;
  }
}

export * from '@olonjs/core';
