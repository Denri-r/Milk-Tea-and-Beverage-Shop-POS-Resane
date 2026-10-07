"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  ArrowUpRight,
  Bag,
  ChartBar,
  Check,
  CheckCircle,
  Coffee,
  Coins,
  Drop,
  GridFour,
  Info,
  Leaf,
  MagnifyingGlass,
  Minus,
  Moon,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  ShoppingBag,
  SlidersHorizontal,
  Storefront,
  Sun,
  Trash,
  Wallet,
  X,
} from "@phosphor-icons/react";
import type { CartItem, CheckoutInput, Product, Receipt } from "@/lib/types";
import { iceOptions, sugarOptions } from "@/lib/catalog";
import { money, validateCash } from "@/lib/money";

type View = "pos" | "orders" | "sales";
function Modal({
  title,
  description,
  open,
  onClose,
  children,
  className = "",
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${className}`}>
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={22} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function dateLabel(date: string, timeOnly = false) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    ...(timeOnly ? {} : { month: "short", day: "numeric", year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
function localDay(date: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(date),
  );
}

function DigitalReceipt({ receipt }: { receipt: Receipt }) {
  return (
    <div className="digital-receipt" id="digital-receipt">
      <div className="receipt-brand">
        <Coffee size={30} weight="duotone" />
        <h3>
          campus cup<span>.</span>
        </h3>
        <p>Milk tea & good company</p>
      </div>
      <div className="receipt-meta">
        <strong>{receipt.reference}</strong>
        <span>{dateLabel(receipt.createdAt)}</span>
        <span>
          {receipt.orderType}
          {receipt.customer ? ` · ${receipt.customer}` : " · Walk-in customer"}
        </span>
      </div>
      <table className="receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item) => (
            <tr key={item.key}>
              <td>
                <strong>{item.name}</strong>
                <small>
                  {money(item.price)} each
                  {item.productId !== "water" &&
                    ` · ${item.sugar} sugar, ${item.ice.toLowerCase()}`}
                </small>
              </td>
              <td>{item.quantity}</td>
              <td>{money(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-totals">
        <div className="receipt-grand">
          <span>Total amount</span>
          <strong>{money(receipt.total)}</strong>
        </div>
        <div>
          <span>Cash received</span>
          <strong>{money(receipt.paid)}</strong>
        </div>
        <div>
          <span>Change</span>
          <strong>{money(receipt.change)}</strong>
        </div>
      </div>
      <p className="receipt-thanks">
        A little cup of happiness. See you again!
      </p>
      <p className="receipt-note">Digital transaction receipt · Paid in cash</p>
    </div>
  );
}

export default function POS({ products }: { products: Product[] }) {
  const [view, setView] = useState<View>("pos");
  const [category, setCategory] = useState("All drinks");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [orderType, setOrderType] = useState<"Takeaway" | "Dine-in">(
    "Takeaway",
  );
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [sugar, setSugar] = useState("100%");
  const [ice, setIce] = useState("Regular ice");
  const [cash, setCash] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);
  const paymentLock = useRef(false);
  const [pendingRequest, setPendingRequest] = useState<CheckoutInput | null>(
    null,
  );
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [historyReceipt, setHistoryReceipt] = useState<Receipt | null>(null);
  const [orders, setOrders] = useState<Receipt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(false);
  const [date, setDate] = useState("");
  const cartRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateDate = () =>
      setDate(
        new Intl.DateTimeFormat("en-PH", {
          timeZone: "Asia/Manila",
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date()),
      );
    const timer = setInterval(updateDate, 60_000);
    const initial = setTimeout(() => {
      updateDate();
      const savedTheme = localStorage.getItem("campus-cup-theme");
      setDark(
        savedTheme
          ? savedTheme === "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(initial);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2300);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        view === "pos" &&
        !paymentOpen &&
        !customizing
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [view, paymentOpen, customizing]);

  async function loadOrders() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOrders(result);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not load order history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }
  function navigate(next: View) {
    setView(next);
    if (next !== "pos") void loadOrders();
  }
  function resetTransaction() {
    setCart([]);
    setCash("");
    setCustomer("");
    setOrderType("Takeaway");
    setReceipt(null);
    setReceiptOpen(false);
    setPaymentOpen(false);
    setPaymentError("");
    setConfirmReset(false);
    setCustomizing(null);
    setNotice("");
    setPendingRequest(null);
    setView("pos");
  }
  const locked = !!receipt || !!pendingRequest;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) =>
      sum +
      products.find((p) => p.id === item.productId)!.price * item.quantity,
    0,
  );
  const visibleProducts = products.filter(
    (p) =>
      (category === "All drinks" || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const payment = validateCash(cash, total);

  function addProduct(
    product: Product,
    selectedSugar = "100%",
    selectedIce = "Regular ice",
  ) {
    if (locked) {
      setNotice("Start a new transaction to add drinks.");
      return;
    }
    const itemSugar = product.id === "water" ? "N/A" : selectedSugar;
    const itemIce = product.id === "water" ? "N/A" : selectedIce;
    const key = `${product.id}-${itemSugar}-${itemIce}`;
    const existing = cart.find((item) => item.key === key);
    if (
      (existing && existing.quantity >= 99) ||
      (!existing && cart.length >= 50)
    ) {
      setNotice("Order limit reached. Complete this transaction first.");
      return;
    }
    setCart((current) =>
      existing
        ? current.map((item) =>
            item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [
            ...current,
            {
              key,
              productId: product.id,
              quantity: 1,
              sugar: itemSugar,
              ice: itemIce,
            },
          ],
    );
    setNotice(`${product.name} added to order`);
  }
  function changeQuantity(key: string, delta: number) {
    if (locked) return;
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(99, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }
  async function pay() {
    if (paymentLock.current) return;
    const validation = validateCash(cash, total);
    if (validation.error) {
      setPaymentError(validation.error);
      return;
    }
    if (!cart.length) {
      setPaymentError("Add at least one drink before checking out.");
      return;
    }
    if (
      !pendingRequest &&
      !window.confirm(
        `Confirm this order?\n\nItems: ${itemCount}\nTotal: ${money(total)}\nCash received: ${money(validation.cents!)}\nChange: ${money(validation.cents! - total)}\n\nSelect OK to complete the payment, or Cancel to review the order.`,
      )
    ) {
      return;
    }
    paymentLock.current = true;
    setPaying(true);
    setPaymentError("");
    // Keep the exact request for network retries so a lost response cannot duplicate a sale.
    const input = pendingRequest ?? {
      requestId: crypto.randomUUID(),
      items: cart,
      customer,
      orderType,
      cash,
    };
    setPendingRequest(input);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) setPendingRequest(null);
        throw new Error(result.error || "Payment could not be saved.");
      }
      setReceipt(result);
      setReceiptOpen(true);
      setPaymentOpen(false);
      setPendingRequest(null);
      setOrders((current) => [
        result,
        ...current.filter((order) => order.id !== result.id),
      ]);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Connection lost. Retry this payment to safely recover its receipt.",
      );
    } finally {
      paymentLock.current = false;
      setPaying(false);
    }
  }
  const todayOrders = orders.filter(
    (order) => localDay(order.createdAt) === localDay(new Date().toISOString()),
  );
  const todayTotal = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const todayCups = todayOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((count, item) => count + item.quantity, 0),
    0,
  );
  const salesProducts = products
    .map((product) => ({
      ...product,
      sold: todayOrders.reduce(
        (sum, order) =>
          sum +
          order.items
            .filter((item) => item.productId === product.id)
            .reduce((count, item) => count + item.quantity, 0),
        0,
      ),
    }))
    .sort((a, b) => b.sold - a.sold);
  const shownOrders = orders.filter((order) =>
    `${order.reference} ${order.customer}`
      .toLowerCase()
      .includes(orderSearch.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to menu
      </a>
      <aside className="sidebar">
        <button
          onClick={() => navigate("pos")}
          className="brand"
          aria-label="Campus Cup home"
        >
          <span className="brand-symbol">
            <Coffee size={31} weight="duotone" />
          </span>
          <span>
            campus
            <br />
            cup<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "pos" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("pos")}
          >
            <GridFour size={21} weight={view === "pos" ? "fill" : "regular"} />
            Point of sale
          </button>
          <button
            className={view === "orders" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("orders")}
          >
            <ReceiptIcon size={21} />
            Order history
          </button>
          <button
            className={view === "sales" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("sales")}
          >
            <ChartBar size={21} />
            Sales overview
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <Leaf size={26} weight="duotone" />
            <p>
              A little tea.
              <br />A lot of happy.
            </p>
            <span>One cup at a time.</span>
          </div>
          <button className="nav-item" onClick={() => setHelpOpen(true)}>
            <Info size={21} />
            Quick guide
            <ArrowUpRight className="nav-end" size={15} />
          </button>
          <div className="cashier">
            <span className="cashier-avatar">CC</span>
            <div>
              <strong>Campus counter</strong>
              <span>Cashier workspace</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="location">
            <Storefront size={20} />
            <span>Campus branch</span>
            <span className="location-divider" />
            <span className="workspace-label">
              {view === "pos"
                ? "Point of sale"
                : view === "orders"
                  ? "Order history"
                  : "Sales overview"}
            </span>
          </div>
          <div className="header-tools">
            <time>{date}</time>
            <button
              className="icon-button theme-button"
              onClick={() => {
                setDark(!dark);
                localStorage.setItem(
                  "campus-cup-theme",
                  !dark ? "dark" : "light",
                );
              }}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="header-avatar">CC</span>
          </div>
        </header>

        <div className={`workspace-body ${view !== "pos" ? "full-width" : ""}`}>
          <main id="main-content" className="main-content">
            {view === "pos" ? (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">FRESH SIPS, HAPPY DAYS</div>
                    <h1>
                      Let’s take an order<span>.</span>
                    </h1>
                    <p>A campus favorite, one cup at a time.</p>
                  </div>
                  <span className="menu-count">
                    {products.length} drinks on the menu
                  </span>
                </div>
                <div className="menu-banner">
                  <span className="banner-icon">
                    <Leaf size={27} weight="duotone" />
                  </span>
                  <div>
                    <strong>Good drinks. Better breaks.</strong>
                    <p>Milk tea, fruity favorites, and a little refreshment.</p>
                  </div>
                  <span className="banner-stamp">
                    MADE FOR
                    <br />
                    <b>your day</b>
                    <span>✳</span>
                  </span>
                </div>
                <div className="menu-toolbar">
                  <div className="section-title">
                    <h2>Our menu</h2>
                    <span>{visibleProducts.length} items</span>
                  </div>
                  <label className="search-box">
                    <MagnifyingGlass size={19} />
                    <input
                      ref={searchRef}
                      type="search"
                      placeholder="Find your drink..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      aria-label="Search drinks"
                    />
                    <kbd>/</kbd>
                  </label>
                </div>
                <div className="category-tabs" aria-label="Drink categories">
                  {[
                    { name: "All drinks", icon: GridFour },
                    { name: "Milk Tea", icon: Coffee },
                    { name: "Fruit Tea", icon: Leaf },
                    { name: "Refreshers", icon: Drop },
                  ].map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      className={
                        category === name ? "category active" : "category"
                      }
                      aria-pressed={category === name}
                      onClick={() => setCategory(name)}
                    >
                      <Icon
                        size={18}
                        weight={category === name ? "fill" : "regular"}
                      />
                      {name}
                      <span>
                        {name === "All drinks"
                          ? products.length
                          : products.filter((p) => p.category === name).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="product-grid">
                  {visibleProducts.map((product, index) => (
                    <article key={product.id} className="product-card">
                      <div className={`product-image ${product.id}`}>
                        <Image
                          src={product.image}
                          alt={`Photograph of ${product.name}`}
                          fill
                          sizes="(max-width: 600px) 45vw, (max-width: 1100px) 35vw, 22vw"
                          priority={index < 3}
                        />
                        {product.id !== "water" && (
                          <button
                            className="customize-button"
                            disabled={locked}
                            onClick={() => {
                              setCustomizing(product);
                              setSugar("100%");
                              setIce("Regular ice");
                            }}
                            aria-label={`Customize ${product.name}`}
                            title="Choose sugar and ice"
                          >
                            <SlidersHorizontal size={18} />
                          </button>
                        )}
                      </div>
                      <div className="product-details">
                        <span className="product-size">{product.size}</span>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <div className="product-bottom">
                          <strong>{money(product.price)}</strong>
                          <button
                            className="add-button"
                            onClick={() => addProduct(product)}
                            disabled={locked}
                            aria-label={`Add ${product.name}`}
                          >
                            <Plus size={18} weight="bold" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {!visibleProducts.length && (
                  <div className="empty-search">
                    <MagnifyingGlass size={34} />
                    <h3>No drinks found</h3>
                    <p>Try another name or browse all drinks.</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSearch("");
                        setCategory("All drinks");
                      }}
                    >
                      Show all drinks
                    </button>
                  </div>
                )}
                <div className="menu-footer">
                  <span>
                    <CheckCircle size={16} />
                    Prices in Philippine pesos
                  </span>
                  <span>
                    Tap <SlidersHorizontal size={14} /> to choose sugar & ice
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">YOUR COUNTER AT A GLANCE</div>
                    <h1>
                      {view === "orders"
                        ? "Every cup, accounted for."
                        : "Today’s little wins."}
                    </h1>
                    <p>
                      {view === "orders"
                        ? "Find completed transactions and reprint receipts."
                        : "Your sales today, in Philippine time."}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => void loadOrders()}
                    disabled={historyLoading}
                  >
                    {historyLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                {historyError ? (
                  <div className="error-banner" role="alert">
                    {historyError}
                    <button onClick={() => void loadOrders()}>Try again</button>
                  </div>
                ) : historyLoading ? (
                  <div className="loading-state" role="status">
                    Loading your transactions...
                  </div>
                ) : view === "orders" ? (
                  <>
                    <label className="search-box history-search">
                      <MagnifyingGlass size={20} />
                      <input
                        aria-label="Search transactions"
                        placeholder="Search reference or customer..."
                        value={orderSearch}
                        onChange={(event) => setOrderSearch(event.target.value)}
                      />
                    </label>
                    <div className="orders-table-wrap">
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th>Transaction</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <strong>{order.reference}</strong>
                                <small>{dateLabel(order.createdAt)}</small>
                              </td>
                              <td>
                                {order.customer || "Walk-in"}
                                <small>{order.orderType}</small>
                              </td>
                              <td>
                                {order.items.reduce(
                                  (sum, item) => sum + item.quantity,
                                  0,
                                )}
                              </td>
                              <td>
                                <strong>{money(order.total)}</strong>
                              </td>
                              <td>
                                <span className="paid-badge">
                                  <Check size={13} />
                                  Paid
                                </span>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  onClick={() => setHistoryReceipt(order)}
                                  aria-label={`View receipt ${order.reference}`}
                                >
                                  <ArrowUpRight size={20} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!shownOrders.length && (
                        <div className="empty-search">
                          <ReceiptIcon size={38} />
                          <h3>
                            {orders.length
                              ? "No matching transactions"
                              : "Your story starts with a cup"}
                          </h3>
                          <p>
                            {orders.length
                              ? "Try another reference or customer name."
                              : "Completed orders will appear here after checkout."}
                          </p>
                          {!orders.length && (
                            <button
                              className="primary"
                              onClick={() => navigate("pos")}
                            >
                              Take an order
                              <ArrowRight size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-grid">
                      <div className="stat-card">
                        <span>
                          <Coins size={20} />
                          Total sales
                        </span>
                        <strong>{money(todayTotal)}</strong>
                        <small>Collected in cash today</small>
                      </div>
                      <div className="stat-card">
                        <span>
                          <ReceiptIcon size={20} />
                          Completed orders
                        </span>
                        <strong>{todayOrders.length}</strong>
                        <small>Successful transactions</small>
                      </div>
                      <div className="stat-card">
                        <span>
                          <Coffee size={20} />
                          Drinks sold
                        </span>
                        <strong>{todayCups}</strong>
                        <small>Across all menu items</small>
                      </div>
                    </div>
                    <section className="sales-list">
                      <h2>On the menu, in the numbers</h2>
                      <p>Today’s sales by drink</p>
                      {salesProducts.map((product) => (
                        <div key={product.id} className="sales-product">
                          <Image
                            src={product.image}
                            width={56}
                            height={56}
                            alt=""
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <small>{product.sold} sold</small>
                          </div>
                          <strong>{money(product.price * product.sold)}</strong>
                        </div>
                      ))}
                    </section>
                  </>
                )}
              </>
            )}
          </main>

          {view === "pos" && (
            <aside
              className="order-panel"
              ref={cartRef}
              aria-label="Current order"
            >
              <div className="order-heading">
                <h2>
                  Current order <span>{itemCount}</span>
                </h2>
                <button
                  className="icon-button"
                  disabled={!cart.length || locked}
                  onClick={() => setConfirmReset(true)}
                  aria-label="Clear order"
                  title="Clear order"
                >
                  <Trash size={20} />
                </button>
              </div>
              <div className="order-type" aria-label="Order type">
                {(["Takeaway", "Dine-in"] as const).map((type) => (
                  <button
                    disabled={locked}
                    key={type}
                    className={orderType === type ? "selected" : ""}
                    aria-pressed={orderType === type}
                    onClick={() => setOrderType(type)}
                  >
                    {type === "Takeaway" ? (
                      <Bag size={18} />
                    ) : (
                      <Coffee size={18} />
                    )}
                    {type}
                  </button>
                ))}
              </div>
              <label className="customer-field">
                <span>
                  Customer name <small>(optional)</small>
                </span>
                <input
                  placeholder="Walk-in customer"
                  value={customer}
                  maxLength={60}
                  disabled={locked}
                  onChange={(event) => setCustomer(event.target.value)}
                />
              </label>
              <div className="cart-section-label">
                <span>ITEM</span>
                <span>SUBTOTAL</span>
              </div>
              <div className="cart-items">
                {cart.length ? (
                  cart.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.productId,
                    )!;
                    return (
                      <div className="cart-item" key={item.key}>
                        <Image
                          src={product.image}
                          width={54}
                          height={60}
                          alt=""
                        />
                        <div className="cart-item-content">
                          <div className="cart-item-top">
                            <h3>{product.name}</h3>
                            <strong>
                              {money(product.price * item.quantity)}
                            </strong>
                          </div>
                          <p>
                            {product.size}
                            {product.id !== "water" && ` · ${item.sugar} sugar`}
                          </p>
                          {product.id !== "water" && <small>{item.ice}</small>}
                          <div className="cart-item-bottom">
                            <div className="quantity-control">
                              <button
                                disabled={locked}
                                onClick={() => changeQuantity(item.key, -1)}
                                aria-label={`Decrease ${product.name}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span aria-label={`Quantity of ${product.name}`}>
                                {item.quantity}
                              </span>
                              <button
                                disabled={locked || item.quantity >= 99}
                                onClick={() => changeQuantity(item.key, 1)}
                                aria-label={`Increase ${product.name}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              className="remove-item"
                              disabled={locked}
                              onClick={() =>
                                setCart((current) =>
                                  current.filter((row) => row.key !== item.key),
                                )
                              }
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-cart">
                    <div className="empty-cart-icon">
                      <ShoppingBag size={37} weight="duotone" />
                    </div>
                    <h3>A fresh start</h3>
                    <p>
                      Pick a drink from the menu
                      <br />
                      to start your order.
                    </p>
                    <span>Good things come in cups.</span>
                  </div>
                )}
              </div>
              <div className="order-payment">
                <div className="subtotal-row">
                  <span>
                    Subtotal{" "}
                    <small>
                      ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </small>
                  </span>
                  <strong>{money(total)}</strong>
                </div>
                <div className="total-row">
                  <span>Total amount</span>
                  <strong data-testid="order-total">{money(total)}</strong>
                </div>
                <p className="payment-note">
                  <Wallet size={15} />
                  Cash payment at the counter
                </p>
                {receipt ? (
                  <>
                    <div className="order-paid">
                      <CheckCircle size={18} weight="fill" />
                      Payment completed
                    </div>
                    <button
                      className="secondary full"
                      onClick={() => setReceiptOpen(true)}
                    >
                      View receipt
                      <ReceiptIcon size={18} />
                    </button>
                    <button className="primary full" onClick={resetTransaction}>
                      New transaction
                      <Plus size={19} />
                    </button>
                  </>
                ) : (
                  <button
                    className="primary full checkout-button"
                    disabled={!cart.length}
                    onClick={() => {
                      setPaymentError("");
                      setPaymentOpen(true);
                    }}
                  >
                    <span>
                      {pendingRequest ? "Recover payment" : "Charge"}
                      {cart.length ? ` ${money(total)}` : " order"}
                    </span>
                    <ArrowRight size={20} />
                  </button>
                )}
                <div className="order-bottom-note">
                  <CheckCircle size={14} />A happy break is on its way.
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      {view === "pos" && (
        <button
          className="mobile-cart"
          onClick={() =>
            cartRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        >
          <ShoppingBag size={20} />
          <span>View order ({itemCount})</span>
          <strong>{money(total)}</strong>
        </button>
      )}
      <div
        className={`toast ${notice ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice && (
          <>
            <CheckCircle size={19} weight="fill" />
            {notice}
          </>
        )}
      </div>

      <Modal
        open={!!customizing}
        onClose={() => setCustomizing(null)}
        title={customizing?.name || "Customize drink"}
        description="A little more you. Same great price."
      >
        {customizing && (
          <>
            <div className="customize-summary">
              <Image
                src={customizing.image}
                width={90}
                height={100}
                alt={customizing.name}
              />
              <div>
                <span>{customizing.size}</span>
                <strong>{money(customizing.price)}</strong>
                <p>{customizing.description}</p>
              </div>
            </div>
            <fieldset className="option-fieldset">
              <legend>Sugar level</legend>
              <div className="options">
                {sugarOptions.map((option) => (
                  <button
                    key={option}
                    className={sugar === option ? "selected" : ""}
                    aria-pressed={sugar === option}
                    onClick={() => setSugar(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="option-fieldset">
              <legend>Ice level</legend>
              <div className="options">
                {iceOptions.map((option) => (
                  <button
                    key={option}
                    className={ice === option ? "selected" : ""}
                    aria-pressed={ice === option}
                    onClick={() => setIce(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              className="primary full"
              onClick={() => {
                addProduct(customizing, sugar, ice);
                setCustomizing(null);
              }}
            >
              Add to order · {money(customizing.price)}
              <Plus size={18} />
            </button>
          </>
        )}
      </Modal>
      <Modal
        open={paymentOpen}
        onClose={() => {
          if (!paying) setPaymentOpen(false);
        }}
        title="Let’s settle up."
        description={`${itemCount} ${itemCount === 1 ? "item" : "items"} · ${orderType.toLowerCase()} · Cash payment`}
        className="payment-modal"
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void pay();
          }}
        >
          <div className="payment-total">
            <span>Total to pay</span>
            <strong>{money(total)}</strong>
          </div>
          <label className="cash-label" htmlFor="cash">
            Cash received
          </label>
          <div className={`cash-input ${paymentError ? "invalid" : ""}`}>
            <span>₱</span>
            <input
              id="cash"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={cash}
              disabled={paying || !!pendingRequest}
              aria-invalid={!!paymentError}
              aria-describedby={paymentError ? "payment-error" : "cash-hint"}
              onChange={(event) => {
                setCash(event.target.value);
                setPaymentError("");
              }}
            />
          </div>
          <p className="field-hint" id="cash-hint">
            Enter the amount handed to you by the customer.
          </p>
          <div className="cash-presets">
            <button
              type="button"
              disabled={paying || !!pendingRequest}
              onClick={() => {
                setCash((total / 100).toFixed(2));
                setPaymentError("");
              }}
            >
              Exact amount
            </button>
            {[100, 200, 500, 1000]
              .filter((value) => value * 100 >= total)
              .slice(0, 3)
              .map((value) => (
                <button
                  type="button"
                  key={value}
                  disabled={paying || !!pendingRequest}
                  onClick={() => {
                    setCash(String(value));
                    setPaymentError("");
                  }}
                >
                  ₱{value}
                </button>
              ))}
          </div>
          {paymentError && (
            <p className="field-error" id="payment-error" role="alert">
              <Info size={19} />
              {paymentError}
            </p>
          )}
          <div className="change-preview">
            <span>Change to return</span>
            <strong>
              {payment.cents !== undefined
                ? money(payment.cents - total)
                : money(0)}
            </strong>
          </div>
          <button className="primary full" type="submit" disabled={paying}>
            {paying
              ? "Saving payment..."
              : pendingRequest
                ? "Retry payment safely"
                : "Confirm payment"}
            {!paying && <CheckCircle size={21} />}
          </button>
          <p className="checkout-hint">
            Confirm once you have received the cash.
          </p>
        </form>
      </Modal>
      <Modal
        open={receiptOpen && !!receipt}
        onClose={() => setReceiptOpen(false)}
        title="Payment successful!"
        description="All settled. Your next happy customer is waiting."
        className="receipt-modal"
      >
        {receipt && (
          <>
            <div className="success-banner">
              <CheckCircle size={24} weight="fill" />
              <div>
                <strong>Return {money(receipt.change)} change</strong>
                <span>Received {money(receipt.paid)} in cash</span>
              </div>
            </div>
            <DigitalReceipt receipt={receipt} />
            <div className="receipt-actions">
              <button className="secondary" onClick={() => window.print()}>
                <Printer size={19} />
                Print receipt
              </button>
              <button className="primary" onClick={resetTransaction}>
                New transaction
                <ArrowRight size={19} />
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!historyReceipt}
        onClose={() => setHistoryReceipt(null)}
        title="Transaction receipt"
        description="A saved copy of your completed order."
        className="receipt-modal"
      >
        {historyReceipt && (
          <>
            <DigitalReceipt receipt={historyReceipt} />
            <button className="primary full" onClick={() => window.print()}>
              <Printer size={19} />
              Print receipt
            </button>
          </>
        )}
      </Modal>
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Start fresh?"
        description="This will clear the current cart, customer name, and cash amount."
      >
        <div className="confirm-actions">
          <button className="secondary" onClick={() => setConfirmReset(false)}>
            Keep this order
          </button>
          <button className="primary" onClick={resetTransaction}>
            Clear & start new
          </button>
        </div>
      </Modal>
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="A good shift starts here."
        description="Everything you need for your next order."
      >
        <ol className="help-steps">
          <li>
            <strong>Pick their favorites</strong>
            <p>
              Use Add to select a drink. The sliders button lets you choose
              sugar and ice.
            </p>
          </li>
          <li>
            <strong>Make it their order</strong>
            <p>
              Adjust quantities with + and −, or use the bin to remove an item.
              Totals update automatically.
            </p>
          </li>
          <li>
            <strong>Take the payment</strong>
            <p>
              Choose Charge, enter the cash received, then confirm. We’ll
              calculate the change.
            </p>
          </li>
          <li>
            <strong>Hand over a little happy</strong>
            <p>
              Print the receipt or start a new transaction. Saved receipts are
              in Order history.
            </p>
          </li>
        </ol>
        <div className="help-note">
          <Info size={20} />
          <p>
            Real stock photographs illustrate the drinks. Actual preparation and
            presentation may vary. Photo sources are listed in the project’s
            image credits.
          </p>
        </div>
      </Modal>
    </div>
  );
}
