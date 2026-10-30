import { config } from '../src/config';
import { expect, test } from '../src/fixtures';

test.describe('admin panel', () => {
  test('rejects a wrong password', async ({ admin }) => {
    expect(await admin.login(config.adminUser, 'definitely-wrong')).toBe(false);
  });

  test('product create, update and delete are reflected in the storefront', async ({ shop, db, separateAdmin }) => {
    const name = `Char Widget ${Date.now()}`;
    const session = await separateAdmin();
    expect(await session.login(config.adminUser, config.adminPassword)).toBe(true);

    await session.createProduct({ name, price: '12.50', quantity: 7, category: 'Graphics Cards', model: 'CHAR-1' });
    expect(await session.findProducts(name)).toEqual([{ name, price: '$12.50' }]);
    if (db) expect(await db.productByName(name)).toEqual({ price: 12.5, quantity: 7, active: true, categories: ['Graphics Cards'] });

    expect(await shop.search(name)).toEqual([name]);
    expect((await shop.openProduct(name)).price).toBe('$12.50');
    expect(await shop.browseCategory(['Hardware', 'Graphics Cards'])).toContain(name);

    await session.updateProductPrice(name, '15.00');
    expect(await session.findProducts(name)).toEqual([{ name, price: '$15.00' }]);
    expect((await shop.openProduct(name)).price).toBe('$15.00');

    await session.deleteProduct(name);
    expect(await session.findProducts(name)).toEqual([]);
    expect(await shop.search(name)).toEqual([]);
    if (db) expect(await db.productByName(name)).toBeNull();
  });
});
