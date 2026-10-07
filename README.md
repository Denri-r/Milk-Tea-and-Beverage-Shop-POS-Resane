# Campus Cup POS

A responsive milk tea and beverage point-of-sale application built with Next.js, React, TypeScript, and SQLite (`better-sqlite3`).

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build`, then `npm start`.

Node.js 20.19+ or a current Node.js LTS release is recommended. A native SQLite package is installed automatically by npm.

## Included functionality

- All six scenario products, with the exact prices supplied: ₱59, ₱65, ₱65, ₱55, ₱69, and ₱20.
- Real locally stored drink photographs, search, and category filters.
- On-screen Add buttons, quantity increase/decrease, individual removal, and clear-order confirmation.
- Live per-item subtotals, total amount, and a clear current-order summary.
- Optional sugar/ice customization at no extra charge; regular size only, as specified.
- Cash entry with a decimal numeric keyboard and distinct messages for blank, nonnumeric, negative, and insufficient payments. The text-backed decimal field intentionally preserves invalid input so it can show the correct validation message instead of silently turning it into a blank value.
- Client and server payment validation, exact integer-centavo calculations, cash presets, and change.
- Payment confirmation and printable digital receipt with items, quantities, subtotals, total, cash received, change, timestamp, and unique transaction reference.
- New transaction resets the cart, customer, cash, payment errors, order type, and current receipt.
- SQLite order history, reprintable receipts, and daily sales overview (Asia/Manila).
- Accessible dialogs, keyboard navigation, light/dark mode, and responsive phone/tablet layouts.

## Storage

The app creates `data/campus-cup.sqlite` automatically and seeds the product menu on first use. Products, completed transactions, and receipt line items are persisted in SQLite. The current unpaid cart is held in browser memory; refreshing discards it. Local database files are excluded from Git.

Set `POS_DB_PATH` to use another database file, such as a separate test database. Database writes are atomic, and checkout requests are idempotent: retrying an identical request after a lost response returns the original receipt instead of charging twice. Prices are read from the database, never trusted from the browser.

This version is a local single-counter cash POS. It binds to loopback by default. It has no staff authentication, payment gateway, refunds, inventory tracking, tax calculation, or statutory receipt integration. Before publishing publicly, add authentication and use a Node host with persistent disk storage for SQLite. Static hosting cannot run the database server.

## Validation

```sh
npm test
npm run lint
npm run build
npm run test:e2e
```

Automated tests cover scenario prices, invalid cash inputs, exact change, receipt data, invalid quantities, server-authoritative pricing, atomic writes, and duplicate-request protection.

The browser tests use installed Google Chrome and a separate, generated SQLite database on port 3100. They also verify all 12 scenario requirements, phone layouts, dark mode, and loaded photos. Test orders never enter the live POS database. Preview screenshots are written to `artifacts/`.

Runtime dependency audit: no known vulnerabilities at implementation time. The development-only Next.js lint toolchain reports a `braces` advisory with no compatible patched version currently available; do not run lint on untrusted glob patterns.

See [IMAGE_CREDITS.md](IMAGE_CREDITS.md) for real stock photography sources. Stock photos illustrate the products; they are not photographs of an actual Campus Cup shop.
