import { checkout, getOrders, ValidationError } from "@/lib/database";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(getOrders(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Order history is unavailable. Please try again." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Next can normalize request.url to localhost; compare the actual browser Host.
  if (origin) {
    try {
      const source = new URL(origin);
      if (
        source.host !== request.headers.get("host") ||
        !["http:", "https:"].includes(source.protocol)
      )
        return Response.json(
          { error: "Invalid request origin." },
          { status: 403 },
        );
    } catch {
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }
  }
  try {
    const text = await request.text();
    if (text.length > 30_000)
      return Response.json({ error: "Order is too large." }, { status: 413 });
    const receipt = checkout(JSON.parse(text));
    return Response.json(receipt, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError)
      return Response.json(
        {
          error:
            error instanceof SyntaxError
              ? "Invalid order data."
              : error.message,
        },
        { status: 400 },
      );
    console.error(error);
    return Response.json(
      {
        error:
          "Payment could not be saved. Your cart is safe; please try again.",
      },
      { status: 500 },
    );
  }
}
