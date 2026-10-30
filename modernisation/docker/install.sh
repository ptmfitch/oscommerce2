#!/bin/sh
# Non-interactive osCommerce install: replays the HTTP calls the web installer's
# JavaScript makes (rpc.php dbCheck/dbImport, then install.php?step=4).
set -eu

LOCAL="http://localhost/install"
DB="server=${OSC_DB_SERVER}&username=${OSC_DB_USER}&password=${OSC_DB_PASSWORD}&name=${OSC_DB_NAME}"
PREFIX="${OSC_DB_PREFIX:-osc_}"

if [ ! -d /var/www/html/install ]; then
  echo "already installed"; exit 0
fi

check() { echo "$1" | grep -q '"status":"1"' || { echo "install step failed: $1" >&2; exit 1; }; }

check "$(curl -fsS -X POST "$LOCAL/rpc.php?action=dbCheck&createDb=true" --data "$DB")"
check "$(curl -fsS -X POST "$LOCAL/rpc.php?action=dbImport" --data "$DB&prefix=$PREFIX")"

curl -fsS -o /tmp/install_4.html -X POST "$LOCAL/install.php?step=4" \
  --data-urlencode "DB_SERVER=${OSC_DB_SERVER}" \
  --data-urlencode "DB_SERVER_USERNAME=${OSC_DB_USER}" \
  --data-urlencode "DB_SERVER_PASSWORD=${OSC_DB_PASSWORD}" \
  --data-urlencode "DB_DATABASE=${OSC_DB_NAME}" \
  --data-urlencode "DB_TABLE_PREFIX=${PREFIX}" \
  --data-urlencode "HTTP_WWW_ADDRESS=${OSC_PUBLIC_URL}" \
  --data-urlencode "DIR_FS_DOCUMENT_ROOT=/var/www/html/" \
  --data-urlencode "CFG_STORE_NAME=${OSC_STORE_NAME:-osCommerce Test Store}" \
  --data-urlencode "CFG_STORE_OWNER_NAME=${OSC_STORE_OWNER:-Store Owner}" \
  --data-urlencode "CFG_STORE_OWNER_EMAIL_ADDRESS=${OSC_STORE_EMAIL:-owner@example.com}" \
  --data-urlencode "CFG_ADMINISTRATOR_USERNAME=${OSC_ADMIN_USER}" \
  --data-urlencode "CFG_ADMINISTRATOR_PASSWORD=${OSC_ADMIN_PASSWORD}" \
  --data-urlencode "CFG_ADMIN_DIRECTORY=admin" \
  --data-urlencode "TIME_ZONE=UTC"

grep -q "successful" /tmp/install_4.html || { echo "step 4 did not report success" >&2; exit 1; }

# Stock lockout is 3 failed admin logins per username or IP in 5 minutes; repeated
# test runs from one IP trip it, so test stacks raise it.
if [ -n "${OSC_ADMIN_LOGIN_ATTEMPTS:-}" ]; then
  php -r '$db = new PDO("mysql:host=".getenv("OSC_DB_SERVER").";dbname=".getenv("OSC_DB_NAME"), getenv("OSC_DB_USER"), getenv("OSC_DB_PASSWORD"));
    $q = $db->prepare("update ".$argv[1]."configuration set configuration_value = ? where configuration_key = \"MODULE_ACTION_RECORDER_ADMIN_LOGIN_ATTEMPTS\"");
    $q->execute([getenv("OSC_ADMIN_LOGIN_ATTEMPTS")]);' "$PREFIX"
fi

rm -rf /var/www/html/install
echo "installed: ${OSC_PUBLIC_URL} (admin: ${OSC_PUBLIC_URL}admin/)"
