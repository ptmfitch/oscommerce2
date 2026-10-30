# Legacy osCommerce 2.4.x runtime. PHP 7.4 is the newest version the code runs on:
# it still calls each(), which was removed in PHP 8.0.
FROM php:7.4-apache

# Debian bullseye (the base of every php:7.4 image) is EOL; its security pool now lives on archive.debian.org.
RUN sed -i '/debian-security/d' /etc/apt/sources.list \
 && echo 'deb http://archive.debian.org/debian-security bullseye-security main' > /etc/apt/sources.list.d/security.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends libpng-dev libjpeg-dev libfreetype6-dev libzip-dev curl \
 && docker-php-ext-configure gd --with-jpeg --with-freetype \
 && docker-php-ext-install pdo_mysql mysqli gd zip \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

RUN { \
      echo 'date.timezone = UTC'; \
      echo 'error_reporting = E_ALL & ~E_DEPRECATED & ~E_NOTICE'; \
      echo 'display_errors = Off'; \
      echo 'log_errors = On'; \
    } > /usr/local/etc/php/conf.d/oscommerce.ini \
 && sed -ri 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

COPY catalog/ /var/www/html/
COPY modernisation/docker/install.sh /usr/local/bin/oscommerce-install
RUN chmod +x /usr/local/bin/oscommerce-install \
 && chown -R www-data:www-data /var/www/html
