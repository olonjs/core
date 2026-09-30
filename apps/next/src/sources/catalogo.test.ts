import { describe, expect, it } from 'vitest';
import { runSourceConformance } from '@olonjs/sources';
import { catalogoSource, fetchCatalogoFromExternalService } from './catalogo';

describe('catalogo (demo external source)', () => {
  it('passes the provider conformance suite', async () => {
    await expect(runSourceConformance(catalogoSource)).resolves.toBeUndefined();
  });

  it('projects a deterministic document keyed by product id', async () => {
    const document = await fetchCatalogoFromExternalService();

    expect(Object.keys(document).sort()).toEqual([
      '1984',
      'dune',
      'il-nome-della-rosa',
      'neuromancer',
    ]);
    for (const [key, item] of Object.entries(document)) {
      expect(item.id).toBe(key);
    }
  });

  it('surfaces failures for fallback/breaker policy to consume', async () => {
    await expect(fetchCatalogoFromExternalService({ fail: true })).rejects.toThrow(
      /unavailable/
    );
  });
});
