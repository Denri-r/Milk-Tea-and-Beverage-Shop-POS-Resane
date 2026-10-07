import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { seedProducts, sugarOptions, iceOptions } from "./catalog";
import { validateCash } from "./money";
import type { CheckoutInput, Product, Receipt, ReceiptItem } from "./types";

export class ValidationError extends Error {}

export function openDatabase(
  filename = process.env.POS_DB_PATH ||
    path.join(process.cwd(), "data", "campus-cup.sqlite"),
) {
  if (filename !== ":memory:")
    mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      price INTEGER NOT NULL CHECK(price >= 0), description TEXT NOT NULL,
      image TEXT NOT NULL, size TEXT NOT NULL, sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL, reference TEXT UNIQUE, created_at TEXT NOT NULL,
      customer TEXT NOT NULL, order_type TEXT NOT NULL,
      total INTEGER NOT NULL CHECK(total >= 0), paid INTEGER NOT NULL CHECK(paid >= total),
      change_amount INTEGER NOT NULL CHECK(change_amount = paid - total)
    );
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id),
      product_id TEXT NOT NULL REFERENCES products(id), name TEXT NOT NULL,
      price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
      sugar TEXT NOT NULL, ice TEXT NOT NULL, subtotal INTEGER NOT NULL CHECK(subtotal = price * quantity)
    );
    CREATE INDEX IF NOT EXISTS transaction_date ON transactions(created_at);
  `);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO products (id, name, category, price, description, image, size, sort_order) VALUES (@id, @name, @category, @price, @description, @image, @size, @sort_order)",
  );
  db.transaction(() =>
    seedProducts.forEach((p, i) => insert.run({ ...p, sort_order: i })),
  )();
  return db;
}

type DB = ReturnType<typeof openDatabase>;
const singleton = globalThis as typeof globalThis & { posDatabase?: DB };
export function getDatabase() {
  return (singleton.posDatabase ??= openDatabase());
}
export function getProducts(db = getDatabase()): Product[] {
  return db
    .prepare(
      "SELECT id, name, category, price, description, image, size FROM products ORDER BY sort_order",
    )
    .all() as Product[];
}
export function getReceipt(id: number, db = getDatabase()): Receipt {
  const row = db
    .prepare(
      `SELECT id, reference, created_at AS createdAt, customer, order_type AS orderType,
    total, paid, change_amount AS change FROM transactions WHERE id = ?`,
    )
    .get(id) as Omit<Receipt, "items"> | undefined;
  if (!row) throw new ValidationError("Transaction not found.");
  const items = db
    .prepare(
      `SELECT CAST(id AS TEXT) AS key, product_id AS productId, name, price,
    quantity, sugar, ice, subtotal FROM transaction_items WHERE transaction_id = ? ORDER BY id`,
    )
    .all(id) as ReceiptItem[];
  return { ...row, items };
}
export function getOrders(db = getDatabase()): Receipt[] {
  const rows = db
    .prepare("SELECT id FROM transactions ORDER BY id DESC")
    .all() as { id: number }[];
  return rows.map((row) => getReceipt(row.id, db));
}

export function checkout(input: CheckoutInput, db = getDatabase()): Receipt {
  if (!input || typeof input !== "object")
    throw new ValidationError("Invalid order. Please try again.");
  if (
    typeof input.requestId !== "string" ||
    !/^[a-zA-Z0-9-]{16,64}$/.test(input.requestId)
  )
    throw new ValidationError(
      "Invalid transaction reference. Please start a new transaction.",
    );
  if (!Array.isArray(input.items) || input.items.length === 0)
    throw new ValidationError("Add at least one drink before checking out.");
  if (input.items.length > 50)
    throw new ValidationError(
      "An order can contain up to 50 different drinks.",
    );
  if (typeof input.customer !== "string" || input.customer.length > 60)
    throw new ValidationError("Customer name must be 60 characters or fewer.");
  if (!["Takeaway", "Dine-in"].includes(input.orderType))
    throw new ValidationError("Select a valid order type.");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        items: input.items,
        cash: input.cash,
        customer: input.customer,
        orderType: input.orderType,
      }),
    )
    .digest("hex");
  return db.transaction(() => {
    const previous = db
      .prepare("SELECT id, fingerprint FROM transactions WHERE request_id = ?")
      .get(input.requestId) as { id: number; fingerprint: string } | undefined;
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new ValidationError(
          "This transaction reference was already used. Check order history before starting a new sale.",
        );
      return getReceipt(previous.id, db);
    }
    const products = getProducts(db);
    const items = input.items.map((item) => {
      if (!item || typeof item !== "object")
        throw new ValidationError("Invalid cart item.");
      const product = products.find((p) => p.id === item.productId);
      if (!product)
        throw new ValidationError(
          "One of the selected products is unavailable.",
        );
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      )
        throw new ValidationError(
          "Each drink quantity must be between 1 and 99.",
        );
      if (
        product.id !== "water" &&
        (!sugarOptions.includes(item.sugar) || !iceOptions.includes(item.ice))
      )
        throw new ValidationError("Select valid sugar and ice options.");
      return {
        ...item,
        name: product.name,
        price: product.price,
        subtotal: product.price * item.quantity,
        sugar: product.id === "water" ? "N/A" : item.sugar,
        ice: product.id === "water" ? "N/A" : item.ice,
      };
    });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const cash = validateCash(input.cash, total);
    if (cash.error) throw new ValidationError(cash.error);
    const paid = cash.cents!;
    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO transactions (request_id, fingerprint, created_at, customer, order_type, total, paid, change_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.requestId,
        fingerprint,
        createdAt,
        input.customer.trim(),
        input.orderType,
        total,
        paid,
        paid - total,
      );
    const id = Number(result.lastInsertRowid);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replaceAll("-", "");
    db.prepare("UPDATE transactions SET reference = ? WHERE id = ?").run(
      `CC-${date}-${String(id).padStart(5, "0")}`,
      id,
    );
    const insertItem = db.prepare(
      `INSERT INTO transaction_items (transaction_id, product_id, name, price, quantity, sugar, ice, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of items)
      insertItem.run(
        id,
        item.productId,
        item.name,
        item.price,
        item.quantity,
        item.sugar,
        item.ice,
        item.subtotal,
      );
    return getReceipt(id, db);
  })();
}
