import { expect, newCustomer, test } from '../src/fixtures';

test.describe('customer accounts', () => {
  test('register creates an account and signs the customer in', async ({ shop, db }) => {
    const c = newCustomer('reg');
    const r = await shop.register(c);
    expect(r.ok, r.message).toBe(true);
    expect(await shop.isLoggedIn()).toBe(true);

    if (db) {
      const row = await db.customerByEmail(c.email);
      expect(row).toMatchObject({ firstName: c.firstName, lastName: c.lastName, defaultAddressCity: c.city });
      expect(row!.passwordHash).not.toContain(c.password);
      expect(row!.passwordHash.length).toBeGreaterThan(20);
    }
  });

  test('registering an email that already exists is rejected', async ({ shop, page }) => {
    const c = newCustomer('dup');
    expect((await shop.register(c)).ok).toBe(true);
    await shop.logout();
    await page.context().clearCookies();
    const again = await shop.register(c);
    expect(again.ok).toBe(false);
    expect(again.message).toMatch(/already exists/i);
  });

  test('registration rejects a too-short password', async ({ shop }) => {
    const c = { ...newCustomer('short'), password: 'abc' };
    const r = await shop.register(c);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/password/i);
  });

  test('log out, then log back in with correct credentials', async ({ shop }) => {
    const c = newCustomer('login');
    expect((await shop.register(c)).ok).toBe(true);
    await shop.logout();
    expect(await shop.isLoggedIn()).toBe(false);
    expect(await shop.login(c.email, c.password)).toBe(true);
  });

  test('login with a wrong password fails', async ({ shop }) => {
    const c = newCustomer('badpw');
    expect((await shop.register(c)).ok).toBe(true);
    await shop.logout();
    expect(await shop.login(c.email, 'wrong-password')).toBe(false);
  });

  test('account pages require sign-in', async ({ shop }) => {
    expect(await shop.isLoggedIn()).toBe(false);
  });
});
