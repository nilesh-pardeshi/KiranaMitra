
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  IndianRupee,
  TrendingUp,
  Package,
  BarChart3,
  RefreshCw,
  CalendarDays,
  AlertCircle,
  ShoppingBag,
  Wallet,
  Boxes,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// Safely normalize different possible API response formats.
function normalizeProductSales(data) {
  let result = [];

  if (Array.isArray(data)) {
    result = data;
  } else if (Array.isArray(data?.items)) {
    result = data.items;
  } else if (Array.isArray(data?.products)) {
    result = data.products;
  } else if (Array.isArray(data?.data)) {
    result = data.data;
  }

  return result.filter(
    (item) => item && typeof item === "object"
  );
}

function ReportCard({
  title,
  value,
  description,
  icon: Icon,
  theme = "green",
}) {
  const themes = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ring-1 transition-transform duration-300 group-hover:scale-110 ${themes[theme]}`}
        >
          <Icon size={23} />
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-9 -right-7 h-24 w-24 rounded-full bg-emerald-50/70 blur-2xl transition-all group-hover:bg-emerald-100" />
    </div>
  );
}

function ChartTooltip({ active, payload, label, type }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 max-w-52 truncate text-sm font-semibold text-slate-800">
        {label}
      </p>

      <p className="text-sm font-bold text-emerald-700">
        {type === "money"
          ? money(payload[0].value)
          : `${Number(payload[0].value || 0).toLocaleString("en-IN")} units`}
      </p>
    </div>
  );
}

export default function Reports() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // The product-sales and estimated-profit APIs filter by an inclusive date range.
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [productSales, setProductSales] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [profit, setProfit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async (signal) => {
    setLoading(true);
    setRefreshing(true);
    setError("");

    try {
      const [
        dailyRes,
        monthlyRes,
        productRes,
        inventoryRes,
        profitRes,
      ] = await Promise.all([
        api.get("/api/reports/daily-sales", { signal }),

        api.get("/api/reports/monthly-sales", {
          params: { year, month },
          signal,
        }),

        api.get("/api/reports/product-sales", {
          params: { start_date: startDate, end_date: endDate },
          signal,
        }),

        api.get("/api/reports/inventory-valuation", {
          signal,
        }),

        api.get("/api/reports/estimated-profit", {
          params: { start_date: startDate, end_date: endDate },
          signal,
        }),
      ]);

      if (signal?.aborted) return;

      setDaily(dailyRes.data ?? {});
      setMonthly(monthlyRes.data ?? {});
      setProductSales(normalizeProductSales(productRes.data));
      setInventory(inventoryRes.data ?? {});
      setProfit(profitRes.data ?? {});
    } catch (err) {
      if (signal?.aborted || err.code === "ERR_CANCELED") return;

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load reports. Please check your backend connection and report APIs."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    const controller = new AbortController();

    loadReports(controller.signal);

    return () => controller.abort();
  }, [loadReports]);

  const chartData = useMemo(() => {
    return productSales.slice(0, 8).map((item, index) => ({
      id: item.product_id ?? item.id ?? index,
      name: String(
        item.product_name ??
        item.name ??
        `Product ${item.product_id ?? index + 1}`
      ),
      quantity: Number(
        item.total_quantity ?? item.quantity_sold ?? 0
      ),
      revenue: Number(
        item.total_revenue ?? item.revenue ?? 0
      ),
    }));
  }, [productSales]);

  const summary = [
    {
      title: "Today's Sales",
      value: money(daily?.total_sales),
      description: `${daily?.total_bills ?? 0} bills recorded today`,
      icon: IndianRupee,
      theme: "green",
    },
    {
      title: "Monthly Revenue",
      value: money(monthly?.total_sales),
      description: "Revenue for selected month",
      icon: TrendingUp,
      theme: "blue",
    },
    {
      title: "Inventory Value",
      value: money(inventory?.inventory_value),
      description: "Based on current purchase prices",
      icon: Package,
      theme: "orange",
    },
    {
      title: "Estimated Gross Profit",
      value: money(profit?.estimated_gross_profit_before_discount),
      description: "Estimated profit for selected month",
      icon: BarChart3,
      theme: "purple",
    },
  ];

  return (
    <div className="min-h-full space-y-7 pb-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <BarChart3 size={23} />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Business Reports
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Understand your store's sales, inventory and profitability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadReports()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/15 transition-all hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh Reports"}
        </button>
      </div>

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mr-auto">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <CalendarDays size={19} className="text-emerald-700" />
            Report Period
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Select the month and year to analyse.
          </p>
        </div>

        <div className="min-w-36">
          <label
            htmlFor="report-month"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Month
          </label>

          <select
            id="report-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString("en-IN", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-28">
          <label
            htmlFor="report-year"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Year
          </label>

          <select
            id="report-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const value = today.getFullYear() - i;

              return (
                <option key={value} value={value}>
                  {value}
                </option>
              );
            })}
          </select>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load reports</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader text="Preparing your business reports..." />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <ReportCard key={item.title} {...item} />
            ))}
          </section>

          {/* Charts */}
          <section className="grid gap-6 xl:grid-cols-2">

            {/* Quantity chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Top-Selling Products
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Top 8 products by quantity sold
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <ShoppingBag size={20} />
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 10,
                        left: 0,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        content={<ChartTooltip type="quantity" />}
                        cursor={{ fill: "#ecfdf5" }}
                      />

                      <Bar
                        dataKey="quantity"
                        name="Quantity Sold"
                        fill="#059669"
                        radius={[7, 7, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                  <ShoppingBag
                    size={35}
                    className="mb-3 text-slate-300"
                  />
                  <p className="font-semibold text-slate-600">
                    No product sales yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Sales data will appear here.
                  </p>
                </div>
              )}
            </div>

            {/* Revenue chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Revenue by Product
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Sales contribution by product
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <Wallet size={20} />
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 10,
                        left: 5,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          `₹${Number(value).toLocaleString("en-IN")}`
                        }
                      />

                      <Tooltip
                        content={<ChartTooltip type="money" />}
                        cursor={{ fill: "#eff6ff" }}
                      />

                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="#2563eb"
                        radius={[7, 7, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                  <Wallet
                    size={35}
                    className="mb-3 text-slate-300"
                  />
                  <p className="font-semibold text-slate-600">
                    No revenue data available
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Product revenue will appear after sales.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Monthly summary */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
                  <TrendingUp size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Monthly Business Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    {new Date(year, month - 1).toLocaleString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Total Sales</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {money(monthly?.total_sales)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Estimated Profit</p>
                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {money(profit?.estimated_gross_profit_before_discount)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Inventory Value</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {money(inventory?.inventory_value)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Low-Stock Items</p>
                <p className="mt-2 text-xl font-bold text-orange-600">
                  {inventory?.low_stock_count ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Product sales table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Product Sales Details
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Performance of the top-selling products
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-700">
                <Boxes size={20} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Quantity Sold</th>
                    <th className="px-5 py-4">Revenue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {chartData.length > 0 ? (
                    chartData.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-emerald-50/50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {item.name}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.quantity.toLocaleString("en-IN")}
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {money(item.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-12 text-center text-slate-400"
                      >
                        No product sales found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
