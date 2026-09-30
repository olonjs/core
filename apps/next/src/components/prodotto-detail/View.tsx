import type { ProdottoDetailData, ProdottoDetailSettings } from './types';

type ProdottoDetailViewProps = {
  data: ProdottoDetailData;
  settings?: ProdottoDetailSettings;
};

function formatPrice(price: number, currency?: string): string {
  return `${(price / 100).toFixed(2)} ${currency ?? 'EUR'}`;
}

/** RSC-safe product detail — resolved from `collection:current` (projected source). */
export function ProdottoDetailView({ data }: ProdottoDetailViewProps) {
  const prodotto = data.item;

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <article
        data-jp-field="item"
        data-jp-item-id={prodotto.id}
        data-jp-item-field="item"
        className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <a href="/prodotti" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {data.backLabel}
        </a>
        <h1 className="mt-10 text-3xl font-semibold">{prodotto.title}</h1>
        <p className="mt-3 text-lg">{formatPrice(prodotto.price, prodotto.currency)}</p>
        {prodotto.description ? (
          <p className="mt-6 text-muted-foreground">{prodotto.description}</p>
        ) : null}
      </article>
    </main>
  );
}
