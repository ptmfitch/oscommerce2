export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dob: string;
  street: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  telephone: string;
}

export interface CartLine {
  name: string;
  quantity: number;
  /** Formatted line total as shown to the shopper, e.g. "$299.99". */
  total: string;
}

export interface OrderTotals {
  subtotal: string;
  /** null when no tax line is shown. */
  tax: string | null;
  shipping: string;
  total: string;
}

export interface OrderSummary {
  orderNumber: string;
  total: string;
  status: string;
}

/** Shopper-facing actions. Each implementation owns its own URLs and selectors. */
export interface ShopDriver {
  home(): Promise<void>;
  /** Category names visible in the storefront category navigation. */
  categoryNames(): Promise<string[]>;
  /** Product names listed after navigating the category path, e.g. ['Hardware', 'Graphics Cards']. */
  browseCategory(path: string[]): Promise<string[]>;
  browseManufacturer(name: string): Promise<string[]>;
  openProduct(name: string): Promise<{ name: string; price: string; optionNames: string[] }>;
  /** Product detail for a product that does not exist; returns whether a not-found message is shown. */
  openMissingProduct(): Promise<boolean>;
  specials(): Promise<{ name: string; prices: string }[]>;
  search(keywords: string): Promise<string[]>;

  addToCart(productName: string): Promise<void>;
  cart(): Promise<{ lines: CartLine[]; subtotal: string | null }>;
  setCartQuantity(productName: string, quantity: number): Promise<void>;
  removeFromCart(productName: string): Promise<void>;

  register(customer: Customer): Promise<{ ok: boolean; message: string }>;
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;

  /** Starts checkout; returns false if the shopper is sent to sign in instead. */
  beginCheckout(): Promise<boolean>;
  /** Walks shipping → payment → confirmation with the given methods; returns confirmation-page totals. */
  checkoutToConfirmation(shippingMethod: string, paymentMethod: string): Promise<OrderTotals>;
  confirmOrder(): Promise<void>;
  orderHistory(): Promise<OrderSummary[]>;
}

export interface AdminDriver {
  login(user: string, password: string): Promise<boolean>;
  createProduct(p: { name: string; price: string; quantity: number; category: string; model: string }): Promise<void>;
  /** Product rows (name + formatted price) matching an admin search. */
  findProducts(search: string): Promise<{ name: string; price: string }[]>;
  updateProductPrice(name: string, price: string): Promise<void>;
  deleteProduct(name: string): Promise<void>;
  /** Orders list, newest first. */
  orders(): Promise<{ orderNumber: string; customer: string; total: string; paymentMethod: string; status: string }[]>;
}
