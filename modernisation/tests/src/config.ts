const env = process.env;

const withSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);

export const config = {
  baseUrl: withSlash(env.BASE_URL ?? 'http://localhost:8080/'),
  adminUrl: withSlash(env.ADMIN_URL ?? `${withSlash(env.BASE_URL ?? 'http://localhost:8080/')}admin/`),
  adminUser: env.ADMIN_USER ?? 'admin',
  adminPassword: env.ADMIN_PASSWORD ?? 'admin123',
  driver: env.SHOP_DRIVER ?? 'legacy',
  /** mysql://user:pass@host:port/db — DB side-effect specs are skipped when unset. */
  dbUrl: env.DB_URL,
  dbTablePrefix: env.DB_TABLE_PREFIX ?? 'osc_',
  /** Expect known legacy defects (see catalog-fixture.ts). Defaults on for the legacy driver only. */
  legacyBugs: env.LEGACY_BUGS ? env.LEGACY_BUGS === 'true' : (env.SHOP_DRIVER ?? 'legacy') === 'legacy',
};
