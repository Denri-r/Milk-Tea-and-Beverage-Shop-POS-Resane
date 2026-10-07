import { expect, test } from "@playwright/test";

test("all required cart, payment, receipt, and reset features work in the browser", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page.screenshot({ path: "artifacts/pos-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Add Classic Milk Tea", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Taro Milk Tea", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Increase Classic Milk Tea", exact: true })
    .click();
  await expect(page.getByTestId("order-total")).toHaveText("₱183.00");
  await page
    .getByRole("button", { name: "Decrease Classic Milk Tea", exact: true })
    .click();
  await expect(page.getByTestId("order-total")).toHaveText("₱124.00");
  await page
    .getByRole("button", { name: "Remove Taro Milk Tea", exact: true })
    .click();
  await expect(page.getByTestId("order-total")).toHaveText("₱59.00");
  await page
    .getByRole("button", { name: "Add Bottled Water", exact: true })
    .click();
  await page.getByPlaceholder("Walk-in customer").fill("Ari");
  await page.screenshot({ path: "artifacts/pos-cart.png", fullPage: true });
  await page
    .getByRole("button", { name: "Charge ₱79.00", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm payment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Please enter the cash amount",
  );
  for (const [amount, message] of [
    ["abc", "valid number"],
    ["-10", "cannot be negative"],
    ["50", "Insufficient cash"],
  ]) {
    await page.getByLabel("Cash received", { exact: true }).fill(amount);
    await page
      .getByRole("button", { name: "Confirm payment", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(message);
  }
  await page.getByLabel("Cash received", { exact: true }).fill("100.50");
  await expect(page.locator(".change-preview")).toContainText("₱21.50");
  await page
    .getByRole("button", { name: "Confirm payment", exact: true })
    .click();
  const success = page.getByRole("alertdialog", {
    name: "Payment successful!",
  });
  await expect(success).toBeVisible();
  await expect(success.locator(".success-change")).toContainText("₱21.50");
  await expect(success.locator(".success-payment-details")).toContainText(
    "₱79.00",
  );
  await expect(success.locator(".success-payment-details")).toContainText(
    "₱100.50",
  );
  await expect(success.locator(".success-reference")).toContainText(
    /CC-\d{8}-\d{5}/,
  );
  await expect(page.locator("#digital-receipt")).toHaveCount(0);
  await expect(
    success.getByRole("button", { name: "View receipt" }),
  ).toBeFocused();
  expect(await (await page.request.get("/api/orders")).json()).toHaveLength(1);
  await page.screenshot({ path: "artifacts/payment-success-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/payment-success-mobile.png" });
  await expect(
    success.getByRole("button", { name: "New transaction" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await success
    .getByRole("button", { name: "View receipt", exact: true })
    .click();
  await expect(success).toHaveCount(0);
  const receipt = page.locator("#digital-receipt");
  await expect(receipt).toContainText("Classic Milk Tea");
  await expect(receipt).toContainText("Bottled Water");
  await expect(receipt).toContainText("₱79.00");
  await expect(receipt).toContainText("₱100.50");
  await expect(receipt).toContainText("₱21.50");
  await expect(receipt).toContainText(/CC-\d{8}-\d{5}/);
  await expect(receipt.locator("tbody tr")).toHaveCount(2);
  await page.screenshot({ path: "artifacts/pos-receipt.png", fullPage: true });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "New transaction", exact: true })
    .click();
  await expect(page.getByTestId("order-total")).toHaveText("₱0.00");
  await expect(page.locator(".cart-item")).toHaveCount(0);
  await expect(page.getByPlaceholder("Walk-in customer")).toHaveValue("");
  await expect(page.locator("#digital-receipt")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add Bottled Water", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Charge ₱20.00", exact: true })
    .click();
  await expect(page.getByLabel("Cash received", { exact: true })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Order history", exact: true })
    .click();
  await expect(page.locator(".orders-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".orders-table")).toContainText("Ari");
  await page.reload();
  await page
    .getByRole("button", { name: "Order history", exact: true })
    .click();
  await expect(page.locator(".orders-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Sales overview", exact: true })
    .click();
  await expect(page.locator(".stat-grid")).toContainText("₱79.00");

  // The success alert also supports starting fresh without opening the receipt.
  await page
    .getByRole("button", { name: "Point of sale", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .getByRole("button", { name: "Add Bottled Water", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Charge ₱20.00", exact: true })
    .click();
  await page.getByRole("button", { name: "Exact amount", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm payment", exact: true })
    .click();
  await expect(success).toBeVisible();
  await expect(success.locator(".success-change")).toContainText("₱0.00");
  await expect(success).toContainText("Exact amount received");
  await page.screenshot({ path: "artifacts/payment-success-dark.png" });
  await success
    .getByRole("button", { name: "New transaction", exact: true })
    .click();
  await expect(success).toHaveCount(0);
  await expect(page.getByTestId("order-total")).toHaveText("₱0.00");
  await expect(page.locator("#digital-receipt")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("search, categories, customization, mobile, dark mode, and local photos", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Fruit Tea 1", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Lychee");
  await page.getByRole("button", { name: "All drinks 6", exact: true }).click();
  await page.getByLabel("Search drinks").fill("taro");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Customize Taro Milk Tea" }).click();
  await page.getByRole("button", { name: "50%", exact: true }).click();
  await page.getByRole("button", { name: "Less ice", exact: true }).click();
  await page
    .getByRole("button", { name: "Add to order · ₱65.00", exact: true })
    .click();
  await expect(page.locator(".cart-item")).toContainText("50% sugar");
  await expect(page.locator(".cart-item")).toContainText("Less ice");
  await page.getByLabel("Search drinks").fill("");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "artifacts/pos-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/pos-mobile.png", fullPage: true });
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.documentElement.scrollWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  await page.getByRole("button", { name: /View order/ }).click();
  await expect(
    page.getByRole("heading", { name: /Current order/ }),
  ).toBeInViewport();
  for (const image of await page.locator(".product-image img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    expect(
      await image.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "Clear order", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear & start new", exact: true })
    .click();
  await expect(page.locator(".cart-item")).toHaveCount(0);
});
