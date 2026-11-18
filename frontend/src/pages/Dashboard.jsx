
import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  Package,
  AlertTriangle,
  Users,
  TrendingUp,
  Wallet,
  Boxes,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
  Store,
  Sparkles,
  CircleAlert,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  theme,
}) {
  const themes = {
    green: {
      icon: "bg-emerald-50 text-emerald-700",
      glow: "bg-emerald-100",
      accent: "text-emerald-700",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      glow: "bg-blue-100",
      accent: "text-blue-700",
    },
    orange: {
      icon: "bg-orange-50 text-orange-700",
      glow: "bg-orange-100",
      accent: "text-orange-700",
    },
    purple: {
      icon: "bg-purple-50 text-purple-700",
      glow: "bg-purple-100",
      accent: "text-purple-700",
    },
  };

  const selected = themes[theme] || themes.green;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40 blur-2xl transition-all duration-300 group-hover:scale-150 ${selected.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-4 break-words text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-2xl p-3 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${selected.icon}`}
        >
          <Icon size={23} strokeWidth={2} />
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
        <span className={`text-xs font-semibold ${selected.accent}`}>
          <ArrowUpRight size={14} className="inline" />
          Live data
        </span>
        <span className="text-xs text-slate-400">
          From your store database
        </span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color = "text-slate-900" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <strong className={`text-sm font-bold ${color}`}>
        {value}
      </strong>
    </div>
  );
}

export default function Dashboard() {
  const [inventory, setInventory] = useState(null);
  const [dailySales, setDailySales] = useState(null);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (signal) => {
    setRefreshing(true);
    setError("");

    try {
      const [
        inventoryRes,
        salesRes,
        customersRes,
      ] = await Promise.all([
        api.get("/api/products/summary", { signal }),
        api.get("/api/reports/daily-sales", { signal }),
        api.get("/api/customers/", { signal }),
      ]);

      if (signal?.aborted) return;

      setInventory(inventoryRes.data ?? {});
      setDailySales(salesRes.data ?? {});
      setCustomers(
        Array.isArray(customersRes.data)
          ? customersRes.data
          : []
      );
    } catch (err) {
      if (
        signal?.aborted ||
        err.code === "ERR_CANCELED"
      ) {
        return;
      }

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load dashboard data. Please check your backend connection."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  const outstanding = customers.reduce(
    (total, customer) =>
      total + Number(customer.outstanding_balance || 0),
    0
  );

  const customersWithUdhar = customers.filter(
    (customer) =>
      Number(customer.outstanding_balance || 0) > 0
  ).length;

  const lowStockCount = Number(
    inventory?.low_stock_count || 0
  );

  const totalProducts = Number(
    inventory?.total_products || 0
  );

  const totalVariants = Number(
    inventory?.total_variants || 0
  );

  const totalSales = Number(
    dailySales?.total_sales || 0
  );

  const collected = Number(
    dailySales?.amount_collected || 0
  );

  const unpaid = Number(
    dailySales?.outstanding_amount || 0
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader text="Preparing your store dashboard..." />
      </div>
    );
  }

  if (error && !inventory && !dailySales) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6"
      >
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 text-red-600" size={22} />

          <div className="flex-1">
            <h2 className="font-bold text-red-800">
              Dashboard unavailable
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-8">

      {/* Welcome header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-700 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-50">
              <Sparkles size={14} />
              Your business overview
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome to KiranaMitra!
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">
              Manage your inventory, track sales and keep your kirana business running smoothly.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:self-center">
            <div className="rounded-xl bg-white/15 p-3">
              <Store size={27} />
            </div>

            <div>
              <p className="text-sm font-bold">
                Store Dashboard
              </p>
              <p className="mt-1 text-xs text-emerald-100">
                Business management
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Header and refresh */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Business Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Today's performance and current store status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800"
        >
          Some dashboard data could not be refreshed: {error}
        </div>
      )}

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={money(totalSales)}
          description={`${dailySales?.total_bills || 0} bills recorded today`}
          icon={IndianRupee}
          theme="green"
        />

        <StatCard
          title="Total Products"
          value={totalProducts.toLocaleString("en-IN")}
          description={`${totalVariants} product variants`}
          icon={Package}
          theme="blue"
        />

        <StatCard
          title="Low Stock Items"
          value={lowStockCount.toLocaleString("en-IN")}
          description={
            lowStockCount > 0
              ? "Products requiring restocking"
              : "No low-stock alerts currently"
          }
          icon={AlertTriangle}
          theme="orange"
        />

        <StatCard
          title="Customer Udhar"
          value={money(outstanding)}
          description={`${customersWithUdhar} customers with outstanding balance`}
          icon={Users}
          theme="purple"
        />
      </section>

      {/* Business summaries */}
      <section className="grid gap-5 xl:grid-cols-2">

        {/* Today's business */}
        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <TrendingUp size={21} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Today's Business
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Daily sales and payment collection
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Today
            </span>
          </div>

          <div className="p-5">
            <SummaryRow
              label="Total Sales"
              value={money(totalSales)}
            />

            <SummaryRow
              label="Amount Collected"
              value={money(collected)}
              color="text-emerald-700"
            />

            <SummaryRow
              label="Unpaid from Today's Bills"
              value={money(unpaid)}
              color="text-orange-600"
            />
          </div>

          <div className="mx-5 mb-5 rounded-xl bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Wallet size={17} />
              <span className="text-xs font-semibold">
                Payment Collection
              </span>
            </div>

            <p className="mt-2 text-lg font-extrabold text-emerald-800">
              {money(collected)}
            </p>
          </div>
        </div>

        {/* Inventory overview */}
        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Boxes size={21} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Inventory Overview
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Current stock and inventory valuation
                </p>
              </div>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              Live
            </span>
          </div>

          <div className="p-5">
            <SummaryRow
              label="Inventory Cost Value"
              value={money(inventory?.inventory_value)}
            />

            <SummaryRow
              label="Active Products"
              value={totalProducts}
            />

            <SummaryRow
              label="Active Variants"
              value={totalVariants}
            />
          </div>

          <div className="mx-5 mb-5 rounded-xl bg-blue-50/70 p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Package size={17} />
              <span className="text-xs font-semibold">
                Current Inventory Value
              </span>
            </div>

            <p className="mt-2 text-lg font-extrabold text-blue-800">
              {money(inventory?.inventory_value)}
            </p>
          </div>
        </div>
      </section>

      {/* Store status */}
      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <ShoppingBag size={21} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">
                Today's Bills
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {dailySales?.total_bills || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
              <Users size={21} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">
                Total Customers
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-700">
              <AlertTriangle size={21} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">
                Stock Alerts
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  lowStockCount > 0
                    ? "text-orange-600"
                    : "text-emerald-700"
                }`}
              >
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer information */}
      <section className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
            <Store size={21} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              Your store, your business, your control.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Keep track of sales, stock and customer accounts with KiranaMitra.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-emerald-700">
          Powered by KiranaMitra
        </span>
      </section>
    </div>
  );
}