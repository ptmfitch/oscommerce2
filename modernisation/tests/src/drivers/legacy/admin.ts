import { Page } from '@playwright/test';
import { config } from '../../config';
import { AdminDriver } from '../types';

/** osCommerce 2.4 admin panel. */
export class LegacyAdmin implements AdminDriver {
  constructor(private page: Page) {}

  private url(path: string) {
    return config.adminUrl + path;
  }

  async login(user: string, password: string) {
    await this.page.goto(this.url('login.php'));
    const f = this.page.locator('form[name="login"]');
    await f.locator('input[name="username"]').fill(user);
    await f.locator('input[name="password"]').fill(password);
    await f.locator('button[type="submit"]').click();
    await this.page.waitForLoadState();
    return !this.page.url().includes('login.php');
  }

  private async categoryId(name: string) {
    await this.page.goto(this.url('categories.php'));
    const options = this.page.locator('select[name="cPath"] option');
    for (const o of await options.all()) {
      if ((await o.innerText()).replace(/\u00a0/g, ' ').trim() === name) return o.getAttribute('value');
    }
    throw new Error(`admin category not found: ${name}`);
  }

  private productRow(name: string) {
    return this.page.locator('table tbody tr', { has: this.page.locator(`td a:text-is("${name}")`) });
  }

  private async searchProducts(term: string) {
    await this.page.goto(this.url(`categories.php?search=${encodeURIComponent(term)}`));
  }

  async createProduct(p: { name: string; price: string; quantity: number; category: string; model: string }) {
    const cPath = await this.categoryId(p.category);
    await this.page.goto(this.url(`categories.php?cPath=${cPath}&action=new_product`));
    const f = this.page.locator('form[name="new_product"]');
    await f.locator('input[name="products_name[1]"]').fill(p.name);
    await f.locator('textarea[name="products_description[1]"]').fill(`${p.name} description`);
    await this.page.locator('a[data-target="#section_data_content"]').click();
    await f.locator('input[name="products_price"]').fill(p.price);
    await f.locator('input[name="products_quantity"]').fill(String(p.quantity));
    await f.locator('input[name="products_model"]').fill(p.model);
    await f.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForLoadState();
  }

  async findProducts(search: string) {
    await this.searchProducts(search);
    const out: { name: string; price: string }[] = [];
    for (const row of await this.page.locator('table tbody tr:has(td.action)').all()) {
      const cells = (await row.locator('td').allInnerTexts()).map((c) => c.trim());
      if (cells[2]?.startsWith('$')) out.push({ name: cells[0], price: cells[2] });
    }
    return out;
  }

  async updateProductPrice(name: string, price: string) {
    await this.searchProducts(name);
    await this.productRow(name).locator('a:has(i[title="Edit"])').click();
    const f = this.page.locator('form[name="new_product"]');
    await this.page.locator('a[data-target="#section_data_content"]').click();
    await f.locator('input[name="products_price"]').fill(price);
    await f.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForLoadState();
  }

  async deleteProduct(name: string) {
    await this.searchProducts(name);
    await this.productRow(name).locator('a:has(i[title="Delete"])').click();
    await this.page.locator('form[name="products"]').getByRole('button', { name: 'Delete' }).click();
    await this.page.waitForLoadState();
  }

  async orders() {
    await this.page.goto(this.url('orders.php'));
    const out = [];
    for (const row of await this.page.locator('table tbody tr:has(td.action)').all()) {
      const cells = (await row.locator('td').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
      const [, customer, orderNumber] = cells[0].match(/^(.*) #(\d+)$/) ?? [];
      out.push({ orderNumber, customer, total: cells[1].replace(/ [A-Z]{3}$/, ''), paymentMethod: cells[2], status: cells[4] });
    }
    return out;
  }
}
