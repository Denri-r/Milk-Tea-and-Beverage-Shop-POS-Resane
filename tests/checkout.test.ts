import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkout,
  getOrders,
  getProducts,
  openDatabase,
} from "../lib/database";
import { validateCash } from "../lib/money";
import type { CheckoutInput } from "../lib/types";

function order(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    requestId: crypto.randomUUID(),
    items: [
      {
        key: "classic",
        productId: "classic",
        quantity: 2,
        sugar: "100%",
        ice: "Regular ice",
      },
      {
        key: "water",
        productId: "water",
        quantity: 1,
        sugar: "N/A",
        ice: "N/A",
      },
    ],
    customer: "Campus customer",
    orderType: "Takeaway",
    cash: "200",
    ...overrides,
  };
}

test("seeds all six required products and exact peso prices", () => {
  const db = openDatabase(":memory:");
  try {
    assert.deepEqual(
      getProducts(db).map((p) => [p.id, p.price]),
      [
        ["classic", 5900],
        ["wintermelon", 6500],
        ["taro", 6500],
        ["lychee", 5500],
        ["brown-sugar", 6900],
        ["water", 2000],
      ],
    );
  } finally {
    db.close();
  }
});
test("cash rejects blank, nonnumeric, negative, and insufficient amounts distinctly", () => {
  assert.match(validateCash(" ", 5900).error!, /Please enter/);
  assert.match(validateCash("abc", 5900).error!, /valid number/);
  assert.match(validateCash("-20", 5900).error!, /negative/);
  assert.match(validateCash("58", 5900).error!, /Insufficient cash.*1.00/);
  for (const value of ["Infinity", "NaN", "1e3", "0x100", "60.001", "1,000"])
    assert.ok(validateCash(value, 5900).error);
  assert.equal(validateCash("59.10", 5900).cents, 5910);
  assert.equal(validateCash("59", 5900).cents, 5900);
});
test("checkout saves accurate receipt, quantities, subtotals, cash and change atomically", () => {
  const db = openDatabase(":memory:");
  try {
    const receipt = checkout(order({ cash: "200.50" }), db);
    assert.equal(receipt.total, 13800);
    assert.equal(receipt.paid, 20050);
    assert.equal(receipt.change, 6250);
    assert.deepEqual(
      receipt.items.map((i) => [i.quantity, i.subtotal]),
      [
        [2, 11800],
        [1, 2000],
      ],
    );
    assert.match(receipt.reference, /^CC-\d{8}-00001$/);
    assert.equal(getOrders(db)[0].reference, receipt.reference);
  } finally {
    db.close();
  }
});
test("failed payments and invalid cart items never create partial transactions", () => {
  const db = openDatabase(":memory:");
  try {
    for (const cash of ["", "words", "-5", "1"])
      assert.throws(() => checkout(order({ cash }), db));
    for (const quantity of [0, -1, 1.5, 100])
      assert.throws(() =>
        checkout(
          order({
            items: [
              {
                key: "x",
                productId: "classic",
                quantity,
                sugar: "100%",
                ice: "Regular ice",
              },
            ],
          }),
          db,
        ),
      );
    assert.throws(() => checkout(order({ items: [] }), db));
    assert.throws(() =>
      checkout(
        order({
          items: [
            {
              key: "x",
              productId: "missing",
              quantity: 1,
              sugar: "100%",
              ice: "Regular ice",
            },
          ],
        }),
        db,
      ),
    );
    assert.equal(getOrders(db).length, 0);
  } finally {
    db.close();
  }
});
test("retries return the same receipt and server ignores forged client prices", () => {
  const db = openDatabase(":memory:");
  try {
    const input = order();
    Object.assign(input.items[0], { price: 1, subtotal: 2 });
    const first = checkout(input, db);
    assert.equal(first.total, 13800);
    assert.equal(checkout(input, db).id, first.id);
    assert.equal(getOrders(db).length, 1);
    assert.throws(
      () => checkout({ ...input, cash: "300" }, db),
      /already used/,
    );
    assert.notEqual(checkout(order(), db).reference, first.reference);
  } finally {
    db.close();
  }
});
