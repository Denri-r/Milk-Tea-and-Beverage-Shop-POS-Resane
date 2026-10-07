import { getProducts } from "@/lib/database";
import POS from "@/components/pos";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function Page() {
  return <POS products={getProducts()} />;
}
