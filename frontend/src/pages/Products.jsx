
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Package,
  X,
  Trash2,
  AlertCircle,
  RefreshCw,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Layers3,
  CheckCircle2,
  Tag,
  ShoppingBag,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

const emptyVariant = {
  brand: "",
  variant_name: "",
  sku: "",
  unit: "piece",
  purchase_price: "",
  selling_price: "",
  current_stock: "",
  reorder_level: "",
  target_stock: "",
};

const initialForm = {
  name: "",
  category: "Grocery",
  description: "",
  variants: [{ ...emptyVariant }],
};

const categories = [
  "Grocery",
  "Dairy",
  "Snacks",
  "Personal Care",
  "Beverages",
  "Household",
];

const variantFields = [
  ["brand", "Brand", "Parivar"],
  ["variant_name", "Pack size / Variant", "1 Litre"],
  ["sku", "SKU (optional)", "OIL-001"],
  ["unit", "Stock unit", "pack"],
  ["purchase_price", "Purchase price", "135"],
  ["selling_price", "Selling price", "150"],
  ["current_stock", "Opening stock", "20"],
  ["reorder_level", "Reorder level", "5"],
  ["target_stock", "Target stock", "30"],
];

export default function Products() {
  const location = useLocation();
  const selectedResultId = location.state?.selectedResultId;
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Apply search query received from the global Navbar search.
  useEffect(() => {
    const globalSearch = location.state?.globalSearch;

    if (typeof globalSearch === "string" && globalSearch.trim()) {
      setSearch(globalSearch.trim());
    }
  }, [location.key, location.state]);

  const fetchProducts = useCallback(async (signal) => {
    try {
      setLoading(true);

      const response = await api.get("/api/products/", {
        params: {
          search: search || undefined,
          category: category || undefined,
        },
        signal,
      });

      const data = response.data;
      setProducts(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.products)
              ? data.products
              : []
      );

      setError("");
    } catch (err) {
      if (err.code === "ERR_CANCELED") return;

      setError(
        err.response?.data?.detail || "Unable to load products."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [search, category]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchProducts(controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchProducts]);

  function updateVariant(index, field, value) {
    setForm((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      ),
    }));
  }

  function addVariant() {
    setForm((previous) => ({
      ...previous,
      variants: [...previous.variants, { ...emptyVariant }],
    }));
  }

  function removeVariant(index) {
    setForm((previous) => ({
      ...previous,
      variants: previous.variants.filter((_, i) => i !== index),
    }));
  }

  function openForm() {
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        variants: form.variants.map((variant) => ({
          ...variant,
          sku: variant.sku.trim() || null,
          purchase_price: Number(variant.purchase_price),
          selling_price: Number(variant.selling_price),
          current_stock: Number(variant.current_stock),
          reorder_level: Number(variant.reorder_level),
          target_stock: Number(variant.target_stock),
        })),
      };

      await api.post("/api/products/", payload);

      setSuccess("Product added successfully.");
      setForm({
        ...initialForm,
        variants: [{ ...emptyVariant }],
      });
      setShowForm(false);
      await fetchProducts();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to create product."
      );
    } finally {
      setSaving(false);
    }
  }

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const allVariants = products.flatMap((product) =>
    (product.variants || []).map((variant) => ({
      ...variant,
      productName: product.name,
      productCategory: product.category,
    }))
  );

  const lowStockCount = allVariants.filter(
    (variant) =>
      Number(variant.reorder_level) > 0 &&
      Number(variant.current_stock) <= Number(variant.reorder_level)
  ).length;

  const totalUnits = allVariants.reduce(
    (total, variant) => total + Number(variant.current_stock || 0),
    0
  );

  const stats = [
    {
      label: "Total Products",
      value: products.length,
      icon: Package,
      color: "blue",
      description: "Products in your catalogue",
    },
    {
      label: "Total Variants",
      value: allVariants.length,
      icon: Layers3,
      color: "violet",
      description: "Brands and pack sizes",
    },
    {
      label: "Total Stock",
      value: totalUnits.toLocaleString("en-IN"),
      icon: Boxes,
      color: "emerald",
      description: "Combined available units",
    },
    {
      label: "Low Stock Items",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "amber",
      description: "At or below reorder level",
    },
  ];

  const statColors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-green-600 to-teal-500 p-6 text-white shadow-lg shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-lime-300/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50">
              <ShoppingBag size={14} />
              STORE CATALOGUE
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Product Management
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Organise your products, manage brands and pack sizes,
              and keep track of your store inventory.
            </p>
          </div>

          <button
            onClick={openForm}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/40"
          >
            <Plus size={19} />
            Add Product
          </button>
        </div>
      </section>

      {/* Feedback messages */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 size={19} className="shrink-0" />
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-1 hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-red-100"
            aria-label="Dismiss error message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {stat.description}
                  </p>
                </div>

                <div
                  className={`rounded-xl p-3 ring-1 ${statColors[stat.color]} transition duration-200 group-hover:scale-110`}
                >
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Search and filters */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900">Product Catalogue</h2>
            <p className="mt-1 text-xs text-gray-500">
              Search and filter your store products
            </p>
          </div>

          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by product name..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="relative sm:w-56">
            <Tag
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            Showing{" "}
            <strong className="text-gray-600">{products.length}</strong>{" "}
            products
          </span>

          {(search || category) && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
              className="font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Product table */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          <Loader text="Loading products..." />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Package size={18} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">All Products</h2>
                <p className="text-xs text-gray-400">
                  Product and variant details
                </p>
              </div>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {allVariants.length} variants
            </span>
          </div>

          {products.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package size={30} />
              </div>

              <h3 className="font-bold text-gray-800">
                No products found
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
                {search || category
                  ? "Try changing your search or category filter."
                  : "Your product catalogue is empty. Add your first product to get started."}
              </p>

              {!search && !category && (
                <button
                  onClick={openForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus size={17} />
                  Add First Product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Product</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Brand / Variant</th>
                    <th className="px-5 py-4 font-semibold">Purchase Price</th>
                    <th className="px-5 py-4 font-semibold">Selling Price</th>
                    <th className="px-5 py-4 font-semibold">Stock Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {products.flatMap((product) =>
                    (product.variants || []).map((variant) => {
                      const isLowStock =
                        Number(variant.reorder_level) > 0 &&
                        Number(variant.current_stock) <=
                          Number(variant.reorder_level);

                      const isSelected =
                        selectedResultId != null &&
                        (String(product.id) === String(selectedResultId) ||
                          String(variant.id) === String(selectedResultId));

                      return (
                        <tr
                          key={variant.id}
                          className={`group transition-colors hover:bg-emerald-50/40 ${
                            isSelected
                              ? "bg-amber-50 ring-2 ring-inset ring-amber-400"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 transition group-hover:scale-105">
                                <Package size={19} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {product.name}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                  SKU: {variant.sku || "Not assigned"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              {product.category}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800">
                              {variant.brand || "—"}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {variant.variant_name || "Standard"}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-medium tabular-nums text-gray-600">
                            {formatMoney(variant.purchase_price)}
                          </td>

                          <td className="px-5 py-4 font-semibold tabular-nums text-gray-900">
                            {formatMoney(variant.selling_price)}
                          </td>

                          <td className="px-5 py-4">
                            <div
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                                isLowStock
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isLowStock ? (
                                <AlertTriangle size={13} />
                              ) : (
                                <TrendingUp size={13} />
                              )}
                              {variant.current_stock} {variant.unit}
                            </div>

                            {isLowStock && (
                              <p className="mt-1 text-[11px] text-red-500">
                                Reorder needed
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Add product modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-black/20">
            {/* Modal heading */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <Package size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 sm:text-xl">
                    Add New Product
                  </h2>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Enter product information and stock variants
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close product form"
                className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
              {/* Basic details */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-6 w-1 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-gray-900">
                    Basic Information
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Product Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. Edible Oil"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Category *
                    </label>
                    <input
                      required
                      list="product-categories"
                      value={form.category}
                      onChange={(event) =>
                        setForm({ ...form, category: event.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="e.g. Grocery"
                    />
                    <datalist id="product-categories">
                      {categories.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                      rows={3}
                      className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Add a short product description..."
                    />
                  </div>
                </div>
              </section>

              {/* Variants */}
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 rounded-full bg-violet-500" />
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Product Variants
                      </h3>
                      <p className="text-xs text-gray-400">
                        Add different brands, sizes and stock details
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  >
                    <Plus size={16} />
                    Add Variant
                  </button>
                </div>

                <div className="space-y-4">
                  {form.variants.map((variant, index) => (
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
                            Variant {index + 1}
                          </p>
                        </div>

                        {form.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            aria-label={`Remove variant ${index + 1}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={15} />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {variantFields.map(([field, label, placeholder]) => {
                          const isNumeric =
                            field.includes("price") ||
                            [
                              "current_stock",
                              "reorder_level",
                              "target_stock",
                            ].includes(field);

                          return (
                            <div key={field}>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                {label}
                                {field !== "sku" && (
                                  <span className="ml-0.5 text-red-500">*</span>
                                )}
                              </label>

                              <input
                                required={field !== "sku"}
                                type={isNumeric ? "number" : "text"}
                                step={isNumeric ? "0.001" : undefined}
                                min={isNumeric ? "0" : undefined}
                                value={variant[field]}
                                onChange={(event) =>
                                  updateVariant(index, field, event.target.value)
                                }
                                placeholder={placeholder}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Modal actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:from-emerald-700 hover:to-green-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving Product...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save Product
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
