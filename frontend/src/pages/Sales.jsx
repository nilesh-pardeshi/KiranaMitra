
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  UserRound,
  RefreshCw,
  Package,
  IndianRupee,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  LoaderCircle,
  ShoppingBag,
  Tag,
  Boxes,
  ArrowRight,
} from "lucide-react";

import api from "../services/api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invoiceId, setInvoiceId] = useState(null);

  const loadData = async () => {
    setPageLoading(true);
    setError("");

    try {
      const [productRes, customerRes] = await Promise.all([
        api.get("/api/products/"),
        api.get("/api/customers/"),
      ]);

      setProducts(productRes.data);
      setCustomers(customerRes.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load products and customers."
      );
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const variants = useMemo(() => {
    return products.flatMap((product) =>
      (product.variants || []).map((variant) => ({
        ...variant,
        productName: product.name,
        category: product.category,
      }))
    );
  }, [products]);

  const filteredVariants = useMemo(() => {
    const query = search.toLowerCase().trim();

    return variants.filter((variant) => {
      const text = `${variant.productName} ${variant.brand || ""} ${
        variant.variant_name || ""
      } ${variant.sku || ""} ${variant.category || ""}`;

      return text.toLowerCase().includes(query);
    });
  }, [variants, search]);

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.selling_price) * item.quantity,
    0
  );

  const safeDiscount = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - safeDiscount);
  const paid = paidAmount === "" ? total : Number(paidAmount);
  const due = Math.max(0, total - paid);

  const cartQuantity = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const outOfStockCount = variants.filter(
    (variant) => Number(variant.current_stock) <= 0
  ).length;

  const addToCart = (variant) => {
    setError("");
    setSuccess("");

    if (Number(variant.current_stock) <= 0) {
      setError("This product is out of stock.");
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (item) => item.id === variant.id
      );

      if (existing) {
        if (existing.quantity >= variant.current_stock) {
          setError("You cannot add more than available stock.");
          return previous;
        }

        return previous.map((item) =>
          item.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...previous,
        { ...variant, quantity: 1 },
      ];
    });
  };

  const changeQuantity = (id, change) => {
    setError("");

    setCart((previous) =>
      previous
        .map((item) => {
          if (item.id !== id) return item;

          const nextQuantity = item.quantity + change;

          if (nextQuantity <= 0) return null;

          if (nextQuantity > item.current_stock) {
            setError("Quantity exceeds available stock.");
            return item;
          }

          return { ...item, quantity: nextQuantity };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCart((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const handleCheckout = async () => {
    setError("");
    setSuccess("");
    setInvoiceId(null);

    if (!cart.length) {
      setError("Please add at least one product.");
      return;
    }

    if (
      !Number.isFinite(safeDiscount) ||
      Number(discount) < 0 ||
      safeDiscount > subtotal
    ) {
      setError("Discount cannot exceed subtotal or be negative.");
      return;
    }

    if (
      !Number.isFinite(paid) ||
      paid < 0 ||
      paid > total
    ) {
      setError("Enter a valid paid amount between zero and total.");
      return;
    }

    if (due > 0 && !customerId) {
      setError("Please select a customer for an unpaid amount.");
      return;
    }

    if (paid > 0 && !paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    const payload = {
      customer_id: customerId ? Number(customerId) : null,
      discount: safeDiscount,
      paid_amount: paid,
      payment_method: paid > 0 ? paymentMethod : null,
      reference_number: referenceNumber || null,
      items: cart.map((item) => ({
        variant_id: item.id,
        quantity: item.quantity,
      })),
    };

    setLoading(true);

    try {
      const response = await api.post("/api/sales/", payload);

      setInvoiceId(response.data.id);
      setSuccess(
        `Sale completed successfully. Invoice: ${response.data.invoice_number}`
      );

      setCart([]);
      setDiscount(0);
      setPaidAmount("");
      setCustomerId("");
      setReferenceNumber("");
      setPaymentMethod("CASH");
      setSearch("");

      await loadData();
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to complete sale. Please check your entries and stock."
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-gray-500">
        <LoaderCircle
          size={34}
          className="animate-spin text-emerald-600"
        />
        <p className="text-sm font-medium">
          Loading billing screen...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 via-indigo-700 to-violet-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white/90">
              <ShoppingCart size={14} />
              POINT OF SALE
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              POS Billing
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Create customer bills, collect payments and generate
              invoices quickly.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="rounded-lg p-1 transition hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={21} className="shrink-0 text-emerald-600" />
          <span className="flex-1 font-semibold">{success}</span>

          {invoiceId && (
            <a
              href={`${api.defaults.baseURL}/api/reports/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <Receipt size={15} />
              Download Invoice PDF
            </a>
          )}

          <button
            onClick={() => {
              setSuccess("");
              setInvoiceId(null);
            }}
            className="rounded-lg p-1 transition hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Quick Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Available Products
            </p>
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <Package size={20} />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
            {variants.length}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Product variants in catalogue
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Registered Customers
            </p>
            <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700">
              <UserRound size={20} />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
            {customers.length}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Available for customer billing
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Out of Stock
            </p>
            <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
              <Boxes size={20} />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
            {outOfStockCount}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Variants currently unavailable
          </p>
        </div>
      </section>

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        {/* Product Selection */}
        <section className="space-y-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Select Products
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search and add products to the current bill.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {filteredVariants.length} results
            </span>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
            <Search size={19} className="shrink-0 text-gray-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, brand, pack, category or SKU..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVariants.map((variant) => {
              const stock = Number(variant.current_stock || 0);
              const outOfStock = stock <= 0;
              const lowStock = stock > 0 && stock <= 5;
              const inCart = cart.some(
                (item) => item.id === variant.id
              );

              return (
                <button
                  key={variant.id}
                  onClick={() => addToCart(variant)}
                  disabled={outOfStock}
                  className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                    outOfStock
                      ? "cursor-not-allowed border-gray-200 opacity-60"
                      : "border-gray-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 transition group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white">
                      <Package size={22} />
                    </div>

                    <div className="flex flex-wrap justify-end gap-1.5">
                      {outOfStock ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700">
                          OUT OF STOCK
                        </span>
                      ) : lowStock ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          IN STOCK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 min-h-[65px]">
                    <h3 className="line-clamp-2 font-bold text-gray-900">
                      {variant.productName}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {[variant.brand, variant.variant_name]
                        .filter(Boolean)
                        .join(" · ") || "Standard variant"}
                    </p>
                  </div>

                  {variant.category && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500">
                      <Tag size={11} />
                      {variant.category}
                    </div>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-2 border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-lg font-extrabold text-blue-700">
                        {money(variant.selling_price)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Stock: {variant.current_stock} {variant.unit}
                      </p>
                    </div>

                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        outOfStock
                          ? "bg-gray-100 text-gray-400"
                          : inCart
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white"
                      }`}
                    >
                      {inCart ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Plus size={19} />
                      )}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-[10px] text-gray-400">
                    SKU: {variant.sku || "Not assigned"}
                  </p>
                </button>
              );
            })}
          </div>

          {filteredVariants.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Search size={25} />
              </div>
              <h3 className="font-bold text-gray-800">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try another product name, brand or SKU.
              </p>
            </div>
          )}
        </section>

        {/* Cart and Checkout */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md xl:sticky xl:top-5">
          {/* Cart Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} />
                  <h2 className="text-lg font-bold">
                    Current Bill
                  </h2>
                </div>
                <p className="mt-1 text-xs text-emerald-100">
                  Review items and checkout.
                </p>
              </div>

              <div className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-white/15 px-3 text-sm font-extrabold">
                {cartQuantity}
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Cart Items */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">
                Bill Items
              </h3>
              <span className="text-xs font-medium text-gray-400">
                {cart.length} products
              </span>
            </div>

            <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-gray-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {item.productName}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {[item.brand, item.variant_name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQuantity(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="min-w-6 text-center text-sm font-bold text-gray-800">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => changeQuantity(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <p className="text-sm font-extrabold text-gray-900">
                      {money(item.selling_price * item.quantity)}
                    </p>
                  </div>

                  <p className="mt-2 text-[11px] text-gray-400">
                    {money(item.selling_price)} × {item.quantity}
                  </p>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                    <ShoppingBag size={23} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Add products to start billing.
                  </p>
                </div>
              )}
            </div>

            {/* Checkout Controls */}
            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">
                  {money(subtotal)}
                </span>
              </div>

              {/* Discount */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Tag size={15} className="text-orange-500" />
                  Discount (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  placeholder="Enter discount"
                />
              </div>

              {/* Total */}
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-800">
                    Grand Total
                  </span>
                  <span className="text-xl font-extrabold text-blue-800">
                    {money(total)}
                  </span>
                </div>
              </div>

              {/* Customer */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <UserRound size={16} className="text-purple-600" />
                  Customer
                </label>

                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Walk-in Customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` (${customer.phone})` : ""}
                    </option>
                  ))}
                </select>

                {due > 0 && !customerId && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    Select a customer to record the pending balance.
                  </p>
                )}
              </div>

              {/* Amount Paid */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Wallet size={16} className="text-emerald-600" />
                  Amount Paid (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`Default: ${total.toFixed(2)}`}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Leave blank to mark the full bill as paid.
                </p>
              </div>

              {/* Payment Method */}
              {paid > 0 && (
                <>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <CreditCard size={16} className="text-blue-600" />
                      Payment Method
                    </label>

                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {paymentMethod === "UPI" && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        UPI Reference Number
                      </label>

                      <input
                        value={referenceNumber}
                        onChange={(e) =>
                          setReferenceNumber(e.target.value)
                        }
                        placeholder="Optional transaction reference"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Balance Due */}
              <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 text-sm">
                <span className="font-semibold text-gray-600">
                  Balance Due
                </span>
                <span
                  className={`font-extrabold ${
                    due > 0 ? "text-orange-600" : "text-emerald-600"
                  }`}
                >
                  {money(due)}
                </span>
              </div>

              {due > 0 && customerId && (
                <div className="rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-700">
                  The pending amount will be associated with the selected
                  customer's account.
                </div>
              )}

              {/* Checkout */}
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : (
                  <CreditCard size={19} />
                )}

                {loading ? "Processing Sale..." : "Complete Sale"}
                {!loading && <ArrowRight size={17} />}
              </button>

              <p className="text-center text-[11px] text-gray-400">
                Verify products and payment details before checkout.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
