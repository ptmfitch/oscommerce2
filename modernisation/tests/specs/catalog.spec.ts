import { catalog } from '../src/catalog-fixture';
import { expect, test } from '../src/fixtures';

test.describe('catalog browsing', () => {
  test('home page lists the top-level categories', async ({ shop }) => {
    const names = await shop.categoryNames();
    for (const c of catalog.topCategories) expect(names).toContain(c);
  });

  test('navigating a category path lists exactly its products', async ({ shop }) => {
    const products = await shop.browseCategory(catalog.graphicsCards.path);
    expect(products.sort()).toEqual([...catalog.graphicsCards.products].sort());
  });

  test('manufacturer filter lists that manufacturer\'s products', async ({ shop }) => {
    const products = await shop.browseManufacturer(catalog.manufacturerMatrox.name);
    expect(products.sort()).toEqual([...catalog.manufacturerMatrox.products].sort());
  });

  test('product page shows name, price and configurable options', async ({ shop }) => {
    const p = await shop.openProduct(catalog.matroxG200.name);
    expect(p.name).toBe(catalog.matroxG200.name);
    expect(p.price).toBe(catalog.matroxG200.price);
    expect(p.optionNames).toEqual(expect.arrayContaining(catalog.matroxG200.options));
  });

  test('unknown product shows a not-found message', async ({ shop }) => {
    expect(await shop.openMissingProduct()).toBe(true);
  });

  test('specials page shows the regular and the special price', async ({ shop }) => {
    const specials = await shop.specials();
    const s = specials.find((x) => x.name === catalog.specialOffer.name);
    expect(s, 'special offer listed').toBeTruthy();
    expect(s!.prices).toContain(catalog.specialOffer.regularPrice);
    expect(s!.prices).toContain(catalog.specialOffer.specialPrice);
  });
});

test.describe('search', () => {
  test('keyword search returns matching products', async ({ shop }) => {
    const results = await shop.search(catalog.searchTerm);
    expect(results.sort()).toEqual([...catalog.manufacturerMatrox.products].sort());
  });

  test('search with no matches returns no products', async ({ shop }) => {
    expect(await shop.search('zzqxnonexistentproduct')).toEqual([]);
  });
});
