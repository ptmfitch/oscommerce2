import mysql, { Connection } from 'mysql2/promise';
import { DbProbe } from './types';

/** Reads the osCommerce 2.4 schema (table prefix configurable, language_id 1 = English). */
export class LegacyMysqlProbe implements DbProbe {
  private constructor(private conn: Connection, private p: string) {}

  static async connect(url: string, prefix: string) {
    return new LegacyMysqlProbe(await mysql.createConnection(url), prefix);
  }

  private async rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.conn.query(sql.replace(/\{(\w+)\}/g, (_, t) => this.p + t), params);
    return rows as T[];
  }

  async customerByEmail(email: string) {
    const [c] = await this.rows<any>(
      `select c.customers_id id, c.customers_firstname firstName, c.customers_lastname lastName,
              c.customers_password passwordHash, c.customers_newsletter newsletter, ab.entry_city city
         from {customers} c left join {address_book} ab on ab.address_book_id = c.customers_default_address_id
        where c.customers_email_address = ?`,
      [email],
    );
    if (!c) return null;
    return { id: c.id, firstName: c.firstName, lastName: c.lastName, passwordHash: c.passwordHash, newsletter: c.newsletter === '1', defaultAddressCity: c.city };
  }

  async latestOrderForEmail(email: string) {
    const [o] = await this.rows<any>(
      `select o.orders_id id, s.orders_status_name status, o.payment_method paymentMethod, o.currency
         from {orders} o join {orders_status} s on s.orders_status_id = o.orders_status and s.language_id = 1
        where o.customers_email_address = ? order by o.orders_id desc limit 1`,
      [email],
    );
    if (!o) return null;
    const lines = await this.rows<any>(
      'select products_name name, products_quantity quantity, final_price unitPrice, products_tax taxRate from {orders_products} where orders_id = ?',
      [o.id],
    );
    const totals = await this.rows<any>('select class code, value from {orders_total} where orders_id = ? order by sort_order', [o.id]);
    const [h] = await this.rows<any>('select count(*) n from {orders_status_history} where orders_id = ?', [o.id]);
    return {
      ...o,
      lines: lines.map((l) => ({ name: l.name, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxRate: Number(l.taxRate) })),
      totals: totals.map((t) => ({ code: t.code, value: Number(t.value) })),
      statusHistoryCount: Number(h.n),
    };
  }

  async productStock(name: string) {
    const [r] = await this.rows<any>(
      `select p.products_quantity quantity, p.products_ordered ordered
         from {products} p join {products_description} pd on pd.products_id = p.products_id and pd.language_id = 1
        where pd.products_name = ?`,
      [name],
    );
    return r ? { quantity: Number(r.quantity), ordered: Number(r.ordered) } : null;
  }

  async productByName(name: string) {
    const [r] = await this.rows<any>(
      `select p.products_id id, p.products_price price, p.products_quantity quantity, p.products_status status
         from {products} p join {products_description} pd on pd.products_id = p.products_id and pd.language_id = 1
        where pd.products_name = ?`,
      [name],
    );
    if (!r) return null;
    const cats = await this.rows<any>(
      `select cd.categories_name name from {products_to_categories} p2c
         join {categories_description} cd on cd.categories_id = p2c.categories_id and cd.language_id = 1
        where p2c.products_id = ?`,
      [r.id],
    );
    return { price: Number(r.price), quantity: Number(r.quantity), active: Number(r.status) === 1, categories: cats.map((c) => c.name) };
  }

  close() {
    return this.conn.end();
  }
}
