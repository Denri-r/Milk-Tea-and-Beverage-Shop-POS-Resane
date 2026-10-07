export type Category = "Milk Tea" | "Fruit Tea" | "Refreshers";
export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  image: string;
  size: string;
}
export interface CartItem {
  key: string;
  productId: string;
  quantity: number;
  sugar: string;
  ice: string;
}
export interface ReceiptItem extends CartItem {
  name: string;
  price: number;
  subtotal: number;
}
export interface Receipt {
  id: number;
  reference: string;
  createdAt: string;
  customer: string;
  orderType: "Takeaway" | "Dine-in";
  total: number;
  paid: number;
  change: number;
  items: ReceiptItem[];
}
export interface CheckoutInput {
  requestId: string;
  items: CartItem[];
  cash: string;
  customer: string;
  orderType: "Takeaway" | "Dine-in";
}
