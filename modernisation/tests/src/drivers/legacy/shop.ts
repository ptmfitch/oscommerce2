import { Page } from '@playwright/test';
import { config } from '../../config';
import { CartLine, Customer, OrderSummary, OrderTotals, ShopDriver } from '../types';

const text = async (page: Page, selector: string) =>
  (await page.locator(selector).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);

/** osCommerce 2.4 storefront (Bootstrap 3 template, schema.org microdata). */
export class LegacyShop implements ShopDriver {
  constructor(private page: Page) {}

  private url(path: string) {
    return config.baseUrl + path;
  }

  private listedProducts() {
    return text(this.page, '#products [itemtype="http://schema.org/Product"] [itemprop="name"]');
  }

  async home() {
    await this.page.goto(this.url('index.php'));
  }

  async categoryNames() {
    await this.home();
    return text(this.page, '.panel-heading:text-is("Categories") + ul > li > a');
  }

  async browseCategory(path: string[]) {
    await this.home();
    for (const name of path) {
      await this.page.locator('.panel-heading:text-is("Categories") + ul a', { hasText: name }).first().click();
    }
    return this.listedProducts();
  }

  async browseManufacturer(name: string) {
    await this.home();
    await Promise.all([
      this.page.waitForURL(/manufacturers_id=/),
      this.page.locator('select[name="manufacturers_id"]').selectOption({ label: name }),
    ]);
    return this.listedProducts();
  }

  private async gotoProduct(name: string) {
    await this.page.goto(this.url(`advanced_search_result.php?keywords=${encodeURIComponent(name)}`));
    await this.page.locator('#products [itemprop="name"]', { hasText: name }).first().click();
  }

  async openProduct(name: string) {
    await this.gotoProduct(name);
    const optionNames = (await text(this.page, 'form[name="cart_quantity"] strong')).map((s) => s.replace(/:$/, ''));
    return {
      name: (await this.page.locator('h1 [itemprop="name"]').innerText()).trim(),
      price: (await this.page.locator('h2[itemprop="offers"]').innerText()).replace(/\s+/g, ' ').trim(),
      optionNames,
    };
  }

  async openMissingProduct() {
    await this.page.goto(this.url('product_info.php?products_id=999999'));
    return this.page.getByText('Product not found!').isVisible();
  }

  async specials() {
    await this.page.goto(this.url('specials.php'));
    const items = this.page.locator('#products [itemtype="http://schema.org/Product"]');
    const out: { name: string; prices: string }[] = [];
    for (const item of await items.all()) {
      out.push({
        name: (await item.locator('[itemprop="name"]').first().innerText()).trim(),
        prices: (await item.locator('[itemprop="offers"]').innerText()).replace(/\s+/g, ' ').trim(),
      });
    }
    return out;
  }

  async search(keywords: string) {
    await this.home();
    await this.page.locator('form[name="quick_find"] input[name="keywords"]').fill(keywords);
    await this.page.locator('form[name="quick_find"] button[type="submit"]').click();
    await this.page.waitForURL(/advanced_search_result/);
    return this.listedProducts();
  }

  async addToCart(productName: string) {
    await this.gotoProduct(productName);
    await this.page.getByRole('button', { name: 'Add to Cart' }).click();
    await this.page.waitForURL(/shopping_cart/);
  }

  async cart() {
    await this.page.goto(this.url('shopping_cart.php'));
    const lines: CartLine[] = [];
    for (const row of await this.page.locator('form[name="cart_quantity"] table tr').all()) {
      lines.push({
        name: (await row.locator('td:nth-child(2) a strong').first().innerText()).trim(),
        quantity: Number(await row.locator('input[name="cart_quantity[]"]').inputValue()),
        total: (await row.locator('td:last-child strong').innerText()).trim(),
      });
    }
    const sub = this.page.locator('p:has-text("Sub-Total:")');
    const subtotal = (await sub.count()) ? (await sub.innerText()).replace(/.*Sub-Total:\s*/, '').trim() : null;
    return { lines, subtotal };
  }

  private cartRow(productName: string) {
    return this.page.locator('form[name="cart_quantity"] table tr', { hasText: productName });
  }

  async setCartQuantity(productName: string, quantity: number) {
    await this.page.goto(this.url('shopping_cart.php'));
    const row = this.cartRow(productName);
    await row.locator('input[name="cart_quantity[]"]').fill(String(quantity));
    await row.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForLoadState();
  }

  async removeFromCart(productName: string) {
    await this.page.goto(this.url('shopping_cart.php'));
    await this.cartRow(productName).getByRole('link', { name: 'Remove' }).click();
    await this.page.waitForLoadState();
  }

  async register(c: Customer) {
    await this.page.goto(this.url('create_account.php'));
    const f = this.page.locator('form[name="create_account"]');
    await f.locator('input[name="gender"][value="m"]').check();
    await f.locator('input[name="firstname"]').fill(c.firstName);
    await f.locator('input[name="lastname"]').fill(c.lastName);
    await f.locator('input[name="dob"]').fill(c.dob);
    await f.locator('input[name="email_address"]').fill(c.email);
    await f.locator('input[name="street_address"]').fill(c.street);
    await f.locator('input[name="city"]').fill(c.city);
    await f.locator('input[name="postcode"]').fill(c.postcode);
    await f.locator('input[name="state"]').fill(c.state);
    await f.locator('select[name="country"]').selectOption({ label: c.country });
    await f.locator('input[name="telephone"]').fill(c.telephone);
    await f.locator('input[name="password"]').fill(c.password);
    await f.locator('input[name="confirmation"]').fill(c.password);
    await this.page.keyboard.press('Escape');
    await f.locator('button[type="submit"]').click();
    await this.page.waitForLoadState();
    const ok = this.page.url().includes('create_account_success');
    const message = ok
      ? (await this.page.locator('h1').innerText()).trim()
      : (await text(this.page, '.alert-danger')).join(' ');
    return { ok, message };
  }

  async login(email: string, password: string) {
    await this.page.goto(this.url('login.php'));
    const f = this.page.locator('form[name="login"]');
    await f.locator('input[name="email_address"]').fill(email);
    await f.locator('input[name="password"]').fill(password);
    await f.locator('button[type="submit"]').click();
    await this.page.waitForLoadState();
    return this.isLoggedIn();
  }

  async logout() {
    await this.page.goto(this.url('logoff.php'));
  }

  async isLoggedIn() {
    await this.page.goto(this.url('account.php'));
    return !this.page.url().includes('login.php');
  }

  async beginCheckout() {
    await this.page.goto(this.url('shopping_cart.php'));
    await this.page.locator('#bodyContent').getByRole('link', { name: 'Checkout' }).click();
    await this.page.waitForLoadState();
    return this.page.url().includes('checkout_shipping');
  }

  async checkoutToConfirmation(shippingMethod: string, paymentMethod: string) {
    const shippingRow = this.page.locator('tr.table-selection', { hasText: shippingMethod });
    if (await shippingRow.locator('input[type="radio"]').count()) await shippingRow.locator('input[type="radio"]').check();
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.waitForURL(/checkout_payment/);

    const paymentRow = this.page.locator('tr.table-selection', { hasText: paymentMethod });
    if (await paymentRow.locator('input[type="radio"]').count()) await paymentRow.locator('input[type="radio"]').check();
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.waitForURL(/checkout_confirmation/);

    const totals: OrderTotals = { subtotal: '', tax: null, shipping: '', total: '' };
    for (const row of await this.page.locator('table tr:has(td.main)').all()) {
      const cells = await row.locator('td.main').allInnerTexts();
      if (cells.length < 2) continue;
      const [title, value] = [cells[0].trim(), cells[1].trim()];
      if (/^sub-total/i.test(title)) totals.subtotal = value;
      else if (/^total/i.test(title)) totals.total = value;
      else if (/tax/i.test(title)) totals.tax = value;
      else totals.shipping = value;
    }
    return totals;
  }

  async confirmOrder() {
    await this.page.locator('form[name="checkout_confirmation"] button[type="submit"]').click();
    await this.page.waitForURL(/checkout_success/);
  }

  async orderHistory() {
    await this.page.goto(this.url('account_history.php'));
    const body = (await this.page.locator('#bodyContent').innerText()).replace(/\s+/g, ' ');
    const orders: OrderSummary[] = [];
    const re = /Order Number:\s*(\d+)\s*\(([^)]+)\).*?Order Cost:\s*(\$[\d,.]+)/g;
    for (const m of body.matchAll(re)) orders.push({ orderNumber: m[1], status: m[2].trim(), total: m[3] });
    return orders;
  }
}
