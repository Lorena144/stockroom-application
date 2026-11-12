export type User = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'staff';
};
export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  stock: number;
  art: string;
  color: string;
  specs: Record<string, string>;
};
export type InventoryProduct = Product & {
  costCents: number;
  supplier: string;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
};
export type ProductResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export const money = (cents: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const stockLabel = (stock: number) =>
  stock === 0 ? 'Out of stock' : stock <= 5 ? 'Low stock' : 'In stock';

export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  art: string;
  color: string;
  quantity: number;
  stock: number;
  unitPriceCents: number;
  addedPriceCents: number;
  subtotalCents: number;
  priceChanged: boolean;
  available: boolean;
};
export type Cart = {
  version: number;
  currency: 'EUR';
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  totalCents: number;
  canCheckout: boolean;
  checkoutToken: string;
};
export type OrderItem = Pick<
  CartItem,
  'productId' | 'sku' | 'name' | 'quantity' | 'unitPriceCents' | 'subtotalCents'
>;
export type OrderSummary = {
  id: string;
  number: string;
  status: 'placed';
  currency: 'EUR';
  totalCents: number;
  itemCount: number;
  totalQuantity: number;
  createdAt: string;
};
export type Order = OrderSummary & { items: OrderItem[] };
export type OrderResult = {
  items: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
