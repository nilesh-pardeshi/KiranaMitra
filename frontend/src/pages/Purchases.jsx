
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  X,
  ShoppingCart,
  Search,
  CalendarDays,
  Package,
  IndianRupee,
  Truck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Boxes,
  Trash2,
  FileText,
  Receipt,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

const emptyItem = {
  variant_id: "",
  quantity: "1",
  unit_cost: "",
};

const initialForm = {
  supplierId: "",
  invoiceNumber: "",
  items: [{ ...emptyItem }],
};

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [purchaseRes, supplierRes, productRes] =
        await Promise.all([
          api.get("/api/purchases/"),
          api.get("/api/suppliers/"),
          api.get("/api/products/"),
        ]);

      const purchaseData = purchaseRes.data;
      const supplierData = supplierRes.data;
      const productData = productRes.data;

      setPurchases(
        Array.isArray(purchaseData)
          ? purchaseData
          : Array.isArray(purchaseData?.items)
            ? purchaseData.items
            : []
      );

      setSuppliers(
        Array.isArray(supplierData)
          ? supplierData
          : Array.isArray(supplierData?.items)
            ? supplierData.items
            : []
      );

      setProducts(
        Array.isArray(productData)
          ? productData
          : Array.isArray(productData?.items)
            ? productData.items
            : Array.isArray(productData?.products)
              ? productData.products
              : []
      );

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const variants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          ...variant,
          product_name: product.name,
          category: product.category,
        }))
      ),
    [products]
  );

  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) *
        Number(item.unit_cost || 0),
    0
  );

  const totalPurchaseValue = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.total_amount || 0),
    0
  );

  const totalItemsPurchased = purchases.reduce(
    (sum, purchase) =>
      sum + (purchase.items?.length || 0),
    0
  );

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return purchases;

    return purchases.filter((purchase) => {
      const supplier = suppliers.find(
        (item) => item.id === purchase.supplier_id
      );

      return (
        String(purchase.id).includes(query) ||
        String(purchase.invoice_number || "")
          .toLowerCase()
          .includes(query) ||
        String(supplier?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(purchase.status || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [purchases, suppliers, search]);

  function updateItem(index, field, value) {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function selectVariant(index, variantId) {
    const variant = variants.find(
      (item) => item.id === Number(variantId)
    );

    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              variant_id: variantId,
              unit_cost: variant
                ? String(variant.purchase_price)
                : "",
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((previous) => [
      ...previous,
      { ...emptyItem },
    ]);
  }

  function removeItem(index) {
    setItems((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function resetForm() {
    setSupplierId("");
    setInvoiceNumber("");
    setItems([{ ...emptyItem }]);
    setShowForm(false);
  }

  function openForm() {
    setError("");
    setSuccess("");
    setSupplierId("");
    setInvoiceNumber("");
    setItems([{ ...emptyItem }]);
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }

    const validItems = items.every(
      (item) =>
        item.variant_id &&
        Number(item.quantity) > 0 &&
        Number(item.unit_cost) >= 0 &&
        item.unit_cost !== ""
    );

    if (!validItems) {
      setError(
        "Select a product and enter valid quantity and cost for every item."
      );
      return;
    }

    const variantIds = items.map((item) =>
      Number(item.variant_id)
    );

    if (new Set(variantIds).size !== variantIds.length) {
      setError(
        "A product variant can only appear once in this purchase. Combine its quantity into one row."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        supplier_id: Number(supplierId),
        invoice_number: invoiceNumber.trim() || null,
        items: items.map((item) => ({
          variant_id: Number(item.variant_id),
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
        })),
      };

      await api.post("/api/purchases/", payload);

      setSuccess(
        "Purchase recorded. Inventory has been updated."
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to record purchase."
      );
    } finally {
      setSaving(false);
    }
  }

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  function getVariantLabel(variant) {
    return `${variant.product_name} — ${variant.brand || ""} ${
      variant.variant_name || ""
    }`;
  }

  const stats = [
    {
      label: "Total Purchases",
      value: purchases.length,
      description: "Recorded purchase transactions",
      icon: ShoppingCart,
      color: "blue",
    },
    {
      label: "Total Purchase Value",
      value: money(totalPurchaseValue),
      description: "Across recorded purchases",
      icon: IndianRupee,
      color: "emerald",
    },
    {
      label: "Items Purchased",
      value: totalItemsPurchased,
      description: "Purchase line items recorded",
      icon: Boxes,
      color: "violet",
    },
  ];

  const statColors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <Loader text="Loading purchases..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-50">
              <Receipt size={14} />
              PURCHASE MANAGEMENT
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Purchase Management
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50/90 sm:text-base">
              Record supplier purchases, manage received goods,
              and automatically update your store inventory.
            </p>
          </div>

          <button
            onClick={openForm}
            disabled={suppliers.length === 0 || variants.length === 0}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Plus size={19} />
            New Purchase
          </button>
        </div>
      </section>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="rounded-lg p-1 transition hover:bg-red-100"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 size={19} className="shrink-0" />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
            className="rounded-lg p-1 transition hover:bg-emerald-100"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Setup warning */}
      {(suppliers.length === 0 || variants.length === 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Purchase setup required</p>
            <p className="mt-1 leading-5">
              {suppliers.length === 0
                ? "Add at least one supplier before recording a purchase."
                : "Add at least one product variant before recording a purchase."}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-gray-900">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    {stat.description}
                  </p>
                </div>

                <div
                  className={`rounded-xl p-3 ring-1 transition duration-200 group-hover:scale-110 ${statColors[stat.color]}`}
                >
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Purchase history */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <ClipboardList size={20} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Purchase History
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  All recorded supplier purchases
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by purchase ID, invoice number, supplier or status..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>
              Showing{" "}
              <strong className="text-gray-600">
                {filteredPurchases.length}
              </strong>{" "}
              of{" "}
              <strong className="text-gray-600">
                {purchases.length}
              </strong>{" "}
              purchases
            </span>

            {search && (
              <button
                onClick={() => setSearch("")}
                className="font-semibold text-blue-700 transition hover:text-blue-900"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Package size={30} />
            </div>

            <h3 className="font-bold text-gray-800">
              {search ? "No matching purchases" : "No purchases yet"}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
              {search
                ? "Try a different purchase ID, invoice number or supplier name."
                : "Your recorded supplier purchases will appear here."}
            </p>

            {!search && suppliers.length > 0 && variants.length > 0 && (
              <button
                onClick={openForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Record First Purchase
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Purchase ID</th>
                  <th className="px-5 py-4 font-semibold">Invoice Number</th>
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Items</th>
                  <th className="px-5 py-4 font-semibold">Total Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPurchases.map((purchase) => {
                  const supplier = suppliers.find(
                    (item) => item.id === purchase.supplier_id
                  );

                  return (
                    <tr
                      key={purchase.id}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                          #{purchase.id}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-600">
                        {purchase.invoice_number || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <Truck size={15} />
                          </div>
                          <span className="font-semibold text-gray-800">
                            {supplier?.name ||
                              `Supplier #${purchase.supplier_id}`}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                          <Package size={13} />
                          {purchase.items?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold tabular-nums text-gray-900">
                        {money(purchase.total_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          {purchase.status || "Recorded"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* New purchase modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              resetForm();
            }
          }}
        >
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-black/20">
            {/* Modal heading */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                  <ShoppingCart size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 sm:text-xl">
                    Create Purchase
                  </h2>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Record goods received from a supplier
                  </p>
                </div>
              </div>

              <button
                onClick={() => !saving && resetForm()}
                disabled={saving}
                aria-label="Close purchase form"
                className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
              {/* Supplier details */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-6 w-1 rounded-full bg-blue-500" />
                  <h3 className="font-bold text-gray-900">
                    Supplier Information
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Supplier
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Truck
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        required
                        value={supplierId}
                        onChange={(event) =>
                          setSupplierId(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((supplier) => (
                          <option
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Supplier Invoice Number
                    </label>

                    <div className="relative">
                      <FileText
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        value={invoiceNumber}
                        onChange={(event) =>
                          setInvoiceNumber(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Optional invoice number"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Purchase items */}
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 rounded-full bg-violet-500" />
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Purchase Items
                      </h3>
                      <p className="text-xs text-gray-400">
                        Select products and enter received quantities
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => {
                    const selectedVariant = variants.find(
                      (variant) =>
                        variant.id === Number(item.variant_id)
                    );

                    const lineTotal =
                      Number(item.quantity || 0) *
                      Number(item.unit_cost || 0);

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-extrabold text-violet-700">
                              {index + 1}
                            </span>

                            <p className="text-sm font-bold text-gray-800">
                              Item {index + 1}
                            </p>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              aria-label={`Remove item ${index + 1}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 size={15} />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="sm:col-span-3">
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                              Product Variant
                              <span className="ml-1 text-red-500">*</span>
                            </label>

                            <select
                              required
                              value={item.variant_id}
                              onChange={(event) =>
                                selectVariant(index, event.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="">Select product variant</option>

                              {variants.map((variant) => (
                                <option
                                  key={variant.id}
                                  value={variant.id}
                                >
                                  {getVariantLabel(variant)} (Stock:{" "}
                                  {variant.current_stock})
                                </option>
                              ))}
                            </select>

                            {selectedVariant && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                  {selectedVariant.category}
                                </span>
                                <span>
                                  Available stock:{" "}
                                  <strong className="text-gray-700">
                                    {selectedVariant.current_stock}{" "}
                                    {selectedVariant.unit}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                              Quantity
                              <span className="ml-1 text-red-500">*</span>
                            </label>

                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              required
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                              Unit Cost (₹)
                              <span className="ml-1 text-red-500">*</span>
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.unit_cost}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "unit_cost",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                              placeholder="Enter unit cost"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                              Line Total
                            </label>

                            <div className="flex min-h-[44px] items-center rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm font-bold text-emerald-800">
                              {money(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Total */}
              <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-emerald-900">
                      Total Purchase Amount
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Sum of all purchase item line totals
                    </p>
                  </div>

                  <p className="text-2xl font-extrabold tracking-tight text-emerald-800">
                    {money(total)}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-2 border-t border-emerald-200/70 pt-3 text-xs text-emerald-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                  The backend recalculates and verifies this total.
                </div>
              </section>

              {/* Form actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !supplierId || total <= 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={17} />
                      Record Purchase
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
