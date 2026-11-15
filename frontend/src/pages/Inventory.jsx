
import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Warehouse,
  ClipboardList,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState(null);
  const [movementType, setMovementType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);

      const [productsRes, summaryRes, lowStockRes] =
        await Promise.all([
          api.get("/api/products/"),
          api.get("/api/products/summary"),
          api.get("/api/products/low-stock"),
        ]);

      const productData = productsRes.data;
      const lowStockData = lowStockRes.data;

      setProducts(
        Array.isArray(productData)
          ? productData
          : Array.isArray(productData?.items)
            ? productData.items
            : Array.isArray(productData?.products)
              ? productData.products
              : []
      );

      setSummary(summaryRes.data);

      setLowStock(
        Array.isArray(lowStockData)
          ? lowStockData
          : Array.isArray(lowStockData?.items)
            ? lowStockData.items
            : []
      );

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  async function updateStock(event) {
    event.preventDefault();

    if (!selected || Number(quantity) <= 0) {
      setError("Please enter a quantity greater than zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.patch(
        `/api/products/variants/${selected.id}/stock`,
        {
          quantity: Number(quantity),
          movement_type: movementType,
          note: note || "Updated from inventory screen",
        }
      );

      setSuccess("Inventory updated successfully.");
      setSelected(null);
      setQuantity("");
      setNote("");

      await loadInventory();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to update stock."
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

  const variants = products.flatMap((product) =>
    (product.variants || []).map((variant) => ({
      ...variant,
      product_name: product.name,
      category: product.category,
    }))
  );

  const totalUnits = variants.reduce(
    (total, variant) =>
      total + Number(variant.current_stock || 0),
    0
  );

  const totalStockValue = variants.reduce(
    (total, variant) =>
      total +
      Number(variant.current_stock || 0) *
        Number(variant.purchase_price || 0),
    0
  );

  const lowStockCount =
    summary?.low_stock_count ?? lowStock.length;

  const stats = [
    {
      label: "Total Products",
      value: summary?.total_products ?? products.length,
      description: `${summary?.total_variants ?? variants.length} product variants`,
      icon: Boxes,
      color: "blue",
    },
    {
      label: "Inventory Cost Value",
      value: money(summary?.inventory_value ?? totalStockValue),
      description: "Based on current purchase prices",
      icon: IndianRupee,
      color: "emerald",
    },
    {
      label: "Low Stock Items",
      value: lowStockCount,
      description: "Need replenishment",
      icon: AlertTriangle,
      color: "amber",
    },
    {
      label: "Total Stock Units",
      value: totalUnits.toLocaleString("en-IN"),
      description: "Combined available quantity",
      icon: Warehouse,
      color: "violet",
    },
  ];

  const statColors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <Loader text="Loading inventory..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-50">
              <Warehouse size={14} />
              STOCK CONTROL CENTRE
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Inventory Management
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-50/90 sm:text-base">
              Monitor stock levels, track inventory value, and
              manage stock movements for your store.
            </p>
          </div>

          <button
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 disabled:opacity-60"
          >
            <RefreshCw size={17} />
            Refresh Inventory
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

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg"
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

      {/* Low stock alerts */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Low Stock Alerts
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Products that need replenishment
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              lowStock.length > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {lowStock.length} alerts
          </span>
        </div>

        {lowStock.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={27} />
            </div>

            <h3 className="font-semibold text-gray-800">
              All stock levels look good!
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              No low-stock products currently.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-amber-50/60 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Variant ID</th>
                  <th className="px-5 py-3.5 font-semibold">Brand</th>
                  <th className="px-5 py-3.5 font-semibold">Variant</th>
                  <th className="px-5 py-3.5 font-semibold">Available Stock</th>
                  <th className="px-5 py-3.5 font-semibold">Reorder Level</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {lowStock.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-amber-50/30"
                  >
                    <td className="px-5 py-4 font-medium text-gray-500">
                      #{item.id}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-800">
                      {item.brand || "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.variant_name || "Standard"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                        <AlertTriangle size={13} />
                        {item.current_stock} {item.unit}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-600">
                      {item.reorder_level} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Current stock */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <ClipboardList size={20} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Current Stock
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Add or remove stock for individual variants
              </p>
            </div>
          </div>

          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {variants.length} variants
          </span>
        </div>

        {variants.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Package size={27} />
            </div>

            <h3 className="font-semibold text-gray-800">
              No inventory available
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              Add products and variants to start managing stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Product</th>
                  <th className="px-5 py-4 font-semibold">Brand / Variant</th>
                  <th className="px-5 py-4 font-semibold">Current Stock</th>
                  <th className="px-5 py-4 font-semibold">Reorder Level</th>
                  <th className="px-5 py-4 font-semibold">Stock Value</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {variants.map((variant) => {
                  const isLow =
                    Number(variant.reorder_level) > 0 &&
                    Number(variant.current_stock) <=
                      Number(variant.reorder_level);

                  return (
                    <tr
                      key={variant.id}
                      className="group transition-colors hover:bg-indigo-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-600 transition group-hover:scale-105">
                            <Package size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {variant.product_name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {variant.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {variant.brand || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {variant.variant_name || "Standard"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                            isLow
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isLow ? (
                            <AlertTriangle size={13} />
                          ) : (
                            <TrendingUp size={13} />
                          )}
                          {variant.current_stock} {variant.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {variant.reorder_level} {variant.unit}
                      </td>

                      <td className="px-5 py-4 font-semibold tabular-nums text-gray-800">
                        {money(
                          Number(variant.current_stock) *
                            Number(variant.purchase_price)
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => {
                            setSelected(variant);
                            setMovementType("IN");
                            setQuantity("");
                            setNote("");
                            setError("");
                            setSuccess("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        >
                          <RefreshCw size={14} />
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock adjustment modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSelected(null);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20">
            {/* Modal heading */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                  <RefreshCw size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Adjust Stock
                  </h2>
                  <p className="text-xs text-gray-500">
                    Update inventory quantity
                  </p>
                </div>
              </div>

              <button
                onClick={() => !saving && setSelected(null)}
                disabled={saving}
                aria-label="Close stock adjustment"
                className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Selected product */}
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm">
                    <Package size={22} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">
                      {selected.product_name}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {selected.brand} {selected.variant_name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-indigo-100 pt-3">
                  <span className="text-xs font-medium text-gray-500">
                    Current available stock
                  </span>
                  <span className="text-lg font-extrabold text-indigo-700">
                    {selected.current_stock} {selected.unit}
                  </span>
                </div>
              </div>

              <form onSubmit={updateStock} className="space-y-4">
                {/* Movement type */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Movement Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMovementType("IN")}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        movementType === "IN"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <ArrowDownCircle size={18} />
                      Stock In
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType("OUT")}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        movementType === "OUT"
                          ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/10"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <ArrowUpCircle size={18} />
                      Stock Out
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Quantity
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Enter quantity"
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    Enter the quantity in {selected.unit}.
                  </p>
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Reason / Note
                  </label>

                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="e.g. New stock received or damaged stock"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    disabled={saving}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || Number(quantity) <= 0}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
                      movementType === "IN"
                        ? "bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-600/20 hover:from-emerald-700 hover:to-green-700"
                        : "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20 hover:from-red-700 hover:to-rose-700"
                    }`}
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        {movementType === "IN" ? (
                          <ArrowDownCircle size={17} />
                        ) : (
                          <ArrowUpCircle size={17} />
                        )}
                        Update Stock
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
