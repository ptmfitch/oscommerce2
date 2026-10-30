# Modernisation — Phase 1

Dev stack for the legacy store plus black-box characterization tests that pin its
current behaviour. The tests are meant to be re-run unchanged against the rebuild.

## Run the legacy store

```bash
cd modernisation
docker compose up -d --build
docker compose exec web oscommerce-install   # scripted install with sample data
```

- Storefront: http://localhost:8080/ — Admin: http://localhost:8080/admin/ (`admin` / `admin123`)
- MariaDB on `localhost:3307` (`osc` / `osc`, database `oscommerce`, table prefix `osc_`)
- Reset: `docker compose down -v`, then the two commands above.

`oscommerce-install` replays the web installer's HTTP calls, then deletes `install/`.
Ports: `WEB_PORT`, `DB_PORT`. Changing `WEB_PORT` requires a reinstall (the URL is
written into the store's config).

### Hacks / deviations from stock

| What | Why |
|---|---|
| PHP 7.4 (EOL) | Code calls `each()`, removed in PHP 8.0. |
| apt security source → `archive.debian.org` | `php:7.4` images are Debian bullseye, which is EOL. |
| `MODULE_ACTION_RECORDER_ADMIN_LOGIN_ATTEMPTS=1000` (`OSC_ADMIN_LOGIN_ATTEMPTS`) | Stock is 3 failures per username **or IP** per 5 min; repeated test runs lock the admin out. Unset the variable to keep stock behaviour. |
| `display_errors=Off`, notices/deprecations not reported | Legacy code emits PHP 7.4 deprecations. |

## Characterization tests

```bash
cd modernisation/tests
npm ci
npx playwright install chromium        # or PW_CHANNEL=chrome to use a system Chrome
DB_URL=mysql://osc:osc@127.0.0.1:3307/oscommerce npm test
```

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `http://localhost:8080/` | Storefront |
| `ADMIN_URL` | `${BASE_URL}admin/` | Admin panel |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin credentials |
| `SHOP_DRIVER` | `legacy` | Which UI driver to use (`src/drivers/<name>`) |
| `DB_URL` | unset | Enables DB side-effect assertions; HTTP-only when unset |
| `DB_TABLE_PREFIX` | `osc_` | Legacy schema prefix |
| `LEGACY_BUGS` | `true` for the legacy driver | Expect known legacy defects instead of correct behaviour |
| `PW_CHANNEL` | unset | Playwright browser channel, e.g. `chrome` |

Specs assume a fresh install with the stock sample catalogue; they create their own
customers/products with unique names, so they can be re-run without a reset.

### Layout

- `specs/` — behaviour, written only against the interfaces below. No URLs or selectors.
- `src/drivers/types.ts` — `ShopDriver` / `AdminDriver`: the business actions a store must support.
- `src/drivers/legacy/` — the only place that knows osCommerce URLs and markup.
- `src/db/types.ts` — `DbProbe`: persisted side effects (customer, order lines/totals, stock).
- `src/db/legacy-mysql.ts` — the only place that knows the legacy schema.
- `src/catalog-fixture.ts` — expected sample-data facts and checkout totals.

### Pointing at the rebuild

1. Add `src/drivers/<rebuild>/` implementing both driver interfaces and register it in `src/fixtures.ts`.
2. Either keep the legacy schema (reuse the probe) or add a `DbProbe` for the new schema.
3. Run with `SHOP_DRIVER=<rebuild> BASE_URL=...`. `LEGACY_BUGS` defaults to `false`, so known defects must be fixed.

### Known legacy defects pinned by `LEGACY_BUGS`

- **Customer zone never saved.** `create_account.php`, `address_book_process.php`,
  `checkout_shipping_address.php`, `checkout_payment_address.php` call `fetchAll()` and then
  `valueInt('zone_id')`, which reads nothing, so `entry_zone_id` is always 0. Storefront
  customers are never charged zone-based tax (Florida 7% in the sample data), and
  zone-restricted shipping/payment modules don't apply to them.
