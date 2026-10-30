import { BrowserContext, test as base } from '@playwright/test';
import { config } from './config';
import { LegacyMysqlProbe } from './db/legacy-mysql';
import { DbProbe } from './db/types';
import { LegacyAdmin } from './drivers/legacy/admin';
import { LegacyShop } from './drivers/legacy/shop';
import { AdminDriver, Customer, ShopDriver } from './drivers/types';
import { floridaAddress, uniqueEmail } from './catalog-fixture';

const drivers = {
  legacy: { shop: LegacyShop, admin: LegacyAdmin },
};

const selected = drivers[config.driver as keyof typeof drivers];
if (!selected) throw new Error(`Unknown SHOP_DRIVER "${config.driver}"; available: ${Object.keys(drivers).join(', ')}`);

export const newCustomer = (tag: string): Customer => ({
  firstName: 'Char',
  lastName: `Tester${tag}`,
  email: uniqueEmail(tag),
  password: 'secret123',
  dob: '05/21/1970',
  ...floridaAddress,
});

export const test = base.extend<
  { shop: ShopDriver; admin: AdminDriver; separateAdmin: () => Promise<AdminDriver> },
  { db: DbProbe | null }
>({
  shop: async ({ page }, use) => use(new selected.shop(page)),
  admin: async ({ page }, use) => use(new selected.admin(page)),
  /** Admin session in its own browser context, for specs that also drive the storefront. */
  separateAdmin: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async () => {
      const ctx = await browser.newContext();
      contexts.push(ctx);
      return new selected.admin(await ctx.newPage());
    });
    for (const ctx of contexts) await ctx.close();
  },
  db: [
    async ({}, use) => {
      const probe = config.dbUrl ? await LegacyMysqlProbe.connect(config.dbUrl, config.dbTablePrefix) : null;
      await use(probe);
      await probe?.close();
    },
    { scope: 'worker' },
  ],
});

export const expect = test.expect;
