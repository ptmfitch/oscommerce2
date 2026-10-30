import { catalog } from '../src/catalog-fixture';
import { expect, test } from '../src/fixtures';

test.describe('shopping cart (guest)', () => {
  test('adding a product shows it in the cart with its price', async ({ shop }) => {
    await shop.addToCart(catalog.matroxG200.name);
    const cart = await shop.cart();
    expect(cart.lines).toEqual([{ name: catalog.matroxG200.name, quantity: 1, total: catalog.matroxG200.price }]);
    expect(cart.subtotal).toBe(catalog.matroxG200.price);
  });

  test('special price is used in the cart', async ({ shop }) => {
    await shop.addToCart(catalog.specialOffer.name);
    const cart = await shop.cart();
    expect(cart.subtotal).toBe(catalog.specialOffer.specialPrice);
  });

  test('changing quantity recalculates line total and subtotal', async ({ shop }) => {
    await shop.addToCart(catalog.matroxG200.name);
    await shop.setCartQuantity(catalog.matroxG200.name, 2);
    const cart = await shop.cart();
    expect(cart.lines[0]).toMatchObject({ quantity: 2, total: '$599.98' });
    expect(cart.subtotal).toBe('$599.98');
  });

  test('adding the same product twice increments quantity', async ({ shop }) => {
    await shop.addToCart(catalog.specialOffer.name);
    await shop.addToCart(catalog.specialOffer.name);
    const cart = await shop.cart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
  });

  test('removing the only product empties the cart', async ({ shop }) => {
    await shop.addToCart(catalog.matroxG200.name);
    await shop.removeFromCart(catalog.matroxG200.name);
    const cart = await shop.cart();
    expect(cart.lines).toEqual([]);
    expect(cart.subtotal).toBeNull();
  });
});
