# Stockroom

A local demo application for practicing UI, API and hybrid test automation.

Features include authentication, product browsing, staff inventory, customer carts,
order placement and order history. All data is fictional; prices are in EUR.

## Requirements

Node.js 24 LTS (24.13 or newer within major 24), npm and Git.

## First-time setup (Windows CMD)

```cmd
git clone https://github.com/Lorena144/stockroom-application.git
cd stockroom-application
npm ci
npm run setup
npm run build
npm run start
```

`setup` creates demo data and accounts on the first run. Later runs apply migrations
and preserve existing data. Generated credentials are in `.local/demo-accounts.txt`,
which is excluded from Git.

Keep the terminal open. For later starts, run `npm run start` from the repository root.
After updating the source, stop the server and repeat `npm ci`, `npm run setup` and
`npm run build` before restarting.

- [Application](http://127.0.0.1:3000)
- [Swagger API documentation](http://127.0.0.1:3000/docs)

Use `127.0.0.1` consistently; `localhost` is a different browser origin.

## CI demo accounts

When `CI=true`, a fresh setup requires `CUSTOMER_PASSWORD` and `STAFF_PASSWORD`
from the CI environment. Each must be a nonblank, single-line password of 16-128 characters.
They configure `customer@stockroom.test` and `staff@stockroom.test`; the second customer
keeps a generated password. Local setup generates passwords, and existing accounts are preserved.

## Documentation

- [Release guide and business rules](docs/Stockroom%20Release%20Guide.html)
- [Security notes](docs/SECURITY.md)
- [Playwright automation framework](https://github.com/Lorena144/stockroom-playwright-automation)

## Scope

Designed for local HTTP use. Public hosting requires a separate deployment configuration.
Payments are not implemented.
