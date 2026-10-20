# Lab app, not production practice: this intentionally keeps uploads/ writable+executable
# and lets the demo SQLite DB live inside the container. See VULNERABILITIES.md.
FROM php:8.2-cli

RUN docker-php-ext-install pdo pdo_sqlite

WORKDIR /app
COPY . /app

# uploads/ must be writable (and reachable) for the unrestricted-upload vuln to work.
RUN mkdir -p uploads && chmod 777 uploads

EXPOSE 8080
# Railway supplies $PORT; fall back to 8080 for a plain `docker run`.
CMD php -S 0.0.0.0:${PORT:-8080} -t /app
