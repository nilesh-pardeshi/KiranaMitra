
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Truck,
  X,
  Phone,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  UserCheck,
  UserX,
  Package,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

const initialForm = {
  name: "",
  phone: "",
  address: "",
};

export default function Suppliers() {
  const location = useLocation();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/api/suppliers/");
      const data = response.data;

      setSuppliers(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.suppliers)
              ? data.suppliers
              : []
      );

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Apply a result selected from the Navbar's global search.
  useEffect(() => {
    const globalSearch = location.state?.globalSearch;
    const resultId = location.state?.selectedResultId;

    if (typeof globalSearch === "string" && globalSearch.trim()) {
      setSearch(globalSearch);
      setSelectedResultId(resultId ?? null);
    }
  }, [location.key, location.state]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/suppliers/", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });

      setSuccess("Supplier registered successfully.");
      setForm({ ...initialForm });
      setShowForm(false);

      await loadSuppliers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to add supplier."
      );
    } finally {
      setSaving(false);
    }
  }

  function openForm() {
    setError("");
    setSuccess("");
    setForm({ ...initialForm });
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) =>
      `${supplier.name || ""} ${supplier.phone || ""} ${supplier.address || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [suppliers, search]);

  const activeCount = suppliers.filter(
    (supplier) => supplier.is_active
  ).length;

  const inactiveCount = suppliers.length - activeCount;

  const stats = [
    {
      label: "Total Suppliers",
      value: suppliers.length,
      description: "Registered distributors",
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Suppliers",
      value: activeCount,
      description: "Currently active",
      icon: UserCheck,
      color: "emerald",
    },
    {
      label: "Inactive Suppliers",
      value: inactiveCount,
      description: "Not currently active",
      icon: UserX,
      color: "amber",
    },
  ];

  const statColors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 p-6 text-white shadow-lg shadow-orange-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-yellow-200/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-orange-50">
              <Truck size={14} />
              SUPPLIER NETWORK
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Supplier Management
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-orange-50/90 sm:text-base">
              Manage your distributors, organise supplier contacts,
              and keep your store's supply network in one place.
            </p>
          </div>

          <button
            onClick={openForm}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-orange-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/40"
          >
            <Plus size={19} />
            Add Supplier
          </button>
        </div>
      </section>

      {/* Feedback messages */}
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
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg"
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
                  className={`rounded-xl p-3 ring-1 transition duration-200 group-hover:scale-110 ${statColors[stat.color]}`}
                >
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Search and supplier list heading */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
              <Building2 size={20} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Your Suppliers
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                View and search your registered suppliers
              </p>
            </div>
          </div>

          <button
            onClick={loadSuppliers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedResultId(null);
            }}
            placeholder="Search supplier by name, phone or address..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            Showing{" "}
            <strong className="text-gray-600">
              {filteredSuppliers.length}
            </strong>{" "}
            of{" "}
            <strong className="text-gray-600">
              {suppliers.length}
            </strong>{" "}
            suppliers
          </span>

          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedResultId(null);
              }}
              className="font-semibold text-orange-700 transition hover:text-orange-900"
            >
              Clear search
            </button>
          )}
        </div>
      </section>

      {/* Supplier cards */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          <Loader text="Loading suppliers..." />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <Truck size={31} />
          </div>

          <h3 className="font-bold text-gray-800">
            {search ? "No matching suppliers" : "No suppliers found"}
          </h3>

          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
            {search
              ? "Try a different supplier name, phone number or address."
              : "Your supplier list is empty. Add your first supplier to get started."}
          </p>

          {!search && (
            <button
              onClick={openForm}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <Plus size={17} />
              Add First Supplier
            </button>
          )}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
            const isActive = Boolean(supplier.is_active);

            return (
              <article
                key={supplier.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg ${
                  selectedResultId != null &&
                  String(supplier.id) === String(selectedResultId)
                    ? "border-orange-400 ring-2 ring-orange-300 ring-offset-2 shadow-lg shadow-orange-100"
                    : "border-gray-100"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-400 to-green-500"
                      : "bg-gradient-to-r from-gray-300 to-gray-400"
                  }`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 transition duration-200 group-hover:scale-105">
                    <Truck size={23} />
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="break-words text-lg font-bold text-gray-900 transition group-hover:text-orange-700">
                    {supplier.name}
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Supplier ID: #{supplier.id}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 transition group-hover:bg-orange-50/50">
                    <div className="mt-0.5 text-orange-600">
                      <Phone size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Phone Number
                      </p>
                      <p className="mt-0.5 break-words text-sm font-medium text-gray-700">
                        {supplier.phone || "No phone provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 transition group-hover:bg-orange-50/50">
                    <div className="mt-0.5 text-orange-600">
                      <MapPin size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Address
                      </p>
                      <p className="mt-0.5 break-words text-sm leading-5 text-gray-700">
                        {supplier.address || "No address provided"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-xs text-gray-400">
                    Supplier #{supplier.id}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                    <Package size={13} />
                    Distributor
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Add supplier modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
                  <Truck size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 sm:text-xl">
                    Add Supplier
                  </h2>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Enter distributor contact details
                  </p>
                </div>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                aria-label="Close supplier form"
                className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Supplier Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <Building2
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    placeholder="e.g. Shree Ganesh Distributors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    placeholder="Supplier contact number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Address
                </label>

                <div className="relative">
                  <MapPin
                    size={17}
                    className="absolute left-3.5 top-3.5 text-gray-400"
                  />

                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    placeholder="Supplier address"
                  />
                </div>
              </div>

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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-600/20 transition hover:-translate-y-0.5 hover:from-orange-700 hover:to-amber-600 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save Supplier
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
