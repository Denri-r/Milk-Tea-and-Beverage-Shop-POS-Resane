export function money(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(cents / 100);
}

// Integer centavos keep totals exact, including decimal cash payments.
export function validateCash(
  raw: unknown,
  total: number,
): { cents: number; error?: never } | { error: string; cents?: never } {
  if (typeof raw !== "string" || !raw.trim())
    return { error: "Please enter the cash amount received." };
  const value = raw.trim();
  if (!Number.isFinite(Number(value)))
    return { error: "Enter a valid number for the cash amount." };
  if (Number(value) < 0) return { error: "Cash amount cannot be negative." };
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    return { error: "Enter a valid number with up to two decimal places." };
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000)
    return { error: "Cash amount must be ₱1,000,000.00 or less." };
  if (cents < total)
    return {
      error: `Insufficient cash. Please collect ${money(total - cents)} more.`,
    };
  return { cents };
}
