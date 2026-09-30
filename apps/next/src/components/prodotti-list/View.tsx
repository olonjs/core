import type { Prodotto } from '@/collections/prodotti';
import type { ProdottiListData, ProdottiListSettings } from './types';

type ProdottiListViewProps = {
  data: ProdottiListData;
  settings?: ProdottiListSettings;
};

function formatPrice(prodotto: Prodotto): string {
  const amount = (prodotto.price / 100).toFixed(2);
  return `${amount} ${prodotto.currency ?? 'EUR'}`;
}

function toProdotti(items: ProdottiListData['items']): Prodotto[] {
  return Object.values(items ?? {}).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * RSC-safe catalog list — data comes from a PROJECTED external source
 * (src/sources/catalogo.ts). The View itself never fetches (CIP).
 */
export function ProdottiListView({ data }: ProdottiListViewProps) {
  const prodotti = toProdotti(data.items);

  return (
    <section className="bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        {data.eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {data.eyebrow}
          </p>
        ) : null}
        <h1 data-jp-field="title" className="mt-2 text-3xl font-semibold">
          {data.title}
        </h1>
        {data.description ? (
          <p data-jp-field="description" className="mt-3 max-w-2xl text-muted-foreground">
            {data.description}
          </p>
        ) : null}

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prodotti.map((prodotto) => (
            <li
              key={prodotto.id}
              data-jp-item-id={prodotto.id}
              data-jp-item-field="items"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <a
                href={`/prodotti/${prodotto.id}`}
                className="text-lg font-medium hover:underline"
              >
                {prodotto.title}
              </a>
              <p className="mt-2 text-sm text-muted-foreground">{formatPrice(prodotto)}</p>
              {prodotto.description ? (
                <p className="mt-3 text-sm text-muted-foreground">{prodotto.description}</p>
              ) : null}
            </li>
          ))}
        </ul>

        {prodotti.length === 0 ? (
          <p className="mt-10 text-muted-foreground">No products available.</p>
        ) : null}
      </div>
    </section>
  );
}
