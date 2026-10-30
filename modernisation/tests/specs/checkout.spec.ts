import { expectedCheckout as X } from '../src/catalog-fixture';
import { config } from '../src/config';
import { expect, newCustomer, test } from '../src/fixtures';

test.describe('checkout', () => {
  test('guest is asked to sign in before checkout', async ({ shop }) => {
    await shop.addToCart(X.product);
    expect(await shop.beginCheckout()).toBe(false);
  });

  test('Florida customer: flat shipping + cash on delivery, totals, history, stock and admin', async ({ shop, db, separateAdmin }) => {
    const c = newCustomer('checkout');
    expect((await shop.register(c)).ok).toBe(true);
    const stockBefore = db ? await db.productStock(X.product) : null;

    await shop.addToCart(X.product);
    expect(await shop.beginCheckout()).toBe(true);
    const totals = await shop.checkoutToConfirmation(X.shippingMethod, X.paymentMethod);
    expect(totals).toEqual({ subtotal: X.subtotal, tax: X.tax, shipping: X.shipping, total: X.total });

    await shop.confirmOrder();
    expect((await shop.cart()).lines).toEqual([]);

    const history = await shop.orderHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ total: X.total, status: X.initialStatus });

    if (db) {
      const order = await db.latestOrderForEmail(c.email);
      expect(order).toMatchObject({ status: X.initialStatus, paymentMethod: X.paymentMethod, currency: 'USD', statusHistoryCount: 1 });
      expect(order!.lines).toEqual([{ name: X.product, quantity: 1, unitPrice: 299.99, taxRate: X.taxRate }]);
      expect(order!.totals).toEqual(X.totalRows.map(([code, value]) => ({ code, value: expect.closeTo(value as number, 3) })));
      const stockAfter = await db.productStock(X.product);
      expect(stockAfter!.quantity).toBe(stockBefore!.quantity - 1);
      expect(stockAfter!.ordered).toBe(stockBefore!.ordered + 1);
    }

    const admin = await separateAdmin();
    expect(await admin.login(config.adminUser, config.adminPassword)).toBe(true);
    expect((await admin.orders())[0]).toEqual({
      orderNumber: history[0].orderNumber,
      customer: `${c.firstName} ${c.lastName}`,
      total: X.total,
      paymentMethod: X.paymentMethod,
      status: X.initialStatus,
    });
  });
});
