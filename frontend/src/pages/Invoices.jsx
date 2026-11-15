
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Eye,
  Download,
  RefreshCw,
  X,
  Receipt,
  FileText,
  IndianRupee,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  ShoppingBag,
  Package,
  CreditCard,
  TrendingUp,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";

import api from "../services/api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusStyle = (status) => {
  if (status === "PAID") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "PARTIAL") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
};

const getStatusIcon = (status) => {
  if (status === "PAID") return CheckCircle2;
  if (status === "PARTIAL") return Clock;
  return AlertCircle;
};

export default function Invoices() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load invoice history
  const loadSales = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/sales/");
      setSales(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load invoice history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Search invoices
  const filteredSales = useMemo(() => {
    const query = search.toLowerCase().trim();

    return sales.filter((sale) =>
      String(sale.invoice_number || "")
        .toLowerCase()
        .includes(query)
    );
  }, [sales, search]);

  // Summary calculations
  const totalInvoices = sales.length;

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalCollected = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.current_paid_amount || 0),
    0
  );

  const totalOutstanding = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.current_outstanding || 0),
    0
  );

  const paidInvoices = sales.filter(
    (sale) => sale.current_payment_status === "PAID"
  ).length;

  const partialInvoices = sales.filter(
    (sale) => sale.current_payment_status === "PARTIAL"
  ).length;

  const unpaidInvoices = sales.filter(
    (sale) =>
      sale.current_payment_status !== "PAID" &&
      sale.current_payment_status !== "PARTIAL"
  ).length;

  // View invoice details
  const viewInvoice = async (id) => {
    setError("");
    setDetailsLoading(true);
    setSelectedSale(null);

    try {
      const response = await api.get(`/api/sales/${id}`);
      setSelectedSale(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load invoice details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // Download PDF invoice
  const downloadInvoice = (id) => {
    const baseURL = api.defaults.baseURL || "";

    window.open(
      `${baseURL}/api/reports/invoices/${id}/pdf`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const closeDetails = () => {
    setSelectedSale(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-800 via-blue-700 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white/90">
              <Receipt size={14} />
              SALES & INVOICES
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Invoice History
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Track sales, monitor customer payments and download
              professional invoices.
            </p>
          </div>

          <button
            onClick={loadSales}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Invoices
          </button>
        </div>
      </section>

      {/* Error Message */}
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

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <FileText size={22} />
            </div>
            <span className="text-xs font-bold text-blue-600">
              SALES RECORDS
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Invoices
          </p>

          <h2 className="mt-1 text-3xl font-extrabold text-gray-900">
            {totalInvoices}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            All recorded sales invoices
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <TrendingUp size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-600">
              TOTAL SALES
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Revenue
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-emerald-700">
            {money(totalRevenue)}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            Total invoice amounts
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
              <Wallet size={22} />
            </div>
            <span className="text-xs font-bold text-purple-600">
              PAYMENTS RECEIVED
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Collected
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-purple-700">
            {money(totalCollected)}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            Current paid amount across invoices
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
              <Clock size={22} />
            </div>
            <span className="text-xs font-bold text-orange-600">
              PENDING PAYMENTS
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Outstanding
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-orange-700">
            {money(totalOutstanding)}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            Current unpaid invoice balances
          </p>
        </div>
      </section>

      {/* Payment Status Overview */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">
              Payment Status Overview
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Distribution of invoice payment statuses.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 p-2 text-gray-500">
            <CreditCard size={19} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Paid Invoices
              </p>
              <p className="text-2xl font-extrabold text-emerald-800">
                {paidInvoices}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700">
                Partial Payments
              </p>
              <p className="text-2xl font-extrabold text-amber-800">
                {partialInvoices}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4">
            <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-red-700">
                Unpaid Invoices
              </p>
              <p className="text-2xl font-extrabold text-red-800">
                {unpaidInvoices}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Invoice History Table */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <Receipt size={19} />
              </div>

              <h2 className="text-lg font-bold text-gray-900">
                Invoice Records
              </h2>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              View invoice details and download PDF documents.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            {filteredSales.length} invoices
          </span>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
          <div className="flex max-w-xl items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
            <Search size={19} className="shrink-0 text-gray-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
            <LoaderCircle
              size={32}
              className="animate-spin text-blue-600"
            />
            <p className="text-sm font-medium">
              Loading invoices...
            </p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Receipt size={30} />
            </div>

            <h3 className="font-bold text-gray-800">
              No invoices found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {search
                ? "Try searching with a different invoice number."
                : "Completed sales will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Current Paid</th>
                  <th className="px-5 py-4">Outstanding</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => {
                  const StatusIcon = getStatusIcon(
                    sale.current_payment_status
                  );

                  return (
                    <tr
                      key={sale.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <Receipt size={19} />
                          </div>

                          <div>
                            <p className="font-bold text-gray-900">
                              {sale.invoice_number}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              Sale #{sale.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays
                            size={14}
                            className="text-gray-400"
                          />
                          {formatDate(sale.created_at)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-bold text-gray-900">
                        {money(sale.total_amount)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">
                        {money(sale.current_paid_amount)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-orange-700">
                        {money(sale.current_outstanding)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                            sale.current_payment_status
                          )}`}
                        >
                          <StatusIcon size={13} />
                          {sale.current_payment_status || "UNKNOWN"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => viewInvoice(sale.id)}
                            className="rounded-lg border border-blue-200 bg-white p-2.5 text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
                            title="View invoice"
                            aria-label={`View invoice ${sale.invoice_number}`}
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            onClick={() => downloadInvoice(sale.id)}
                            className="rounded-lg border border-emerald-200 bg-white p-2.5 text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-50"
                            title="Download PDF"
                            aria-label={`Download invoice ${sale.invoice_number}`}
                          >
                            <Download size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Details Loading */}
      {detailsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-xl">
            <LoaderCircle
              size={24}
              className="animate-spin text-blue-600"
            />
            <span className="text-sm font-semibold text-gray-700">
              Loading invoice details...
            </span>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-800 to-indigo-600 px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3">
                  <Receipt size={23} />
                </div>

                <div>
                  <h2 className="text-lg font-bold sm:text-xl">
                    Invoice Details
                  </h2>

                  <p className="mt-1 text-xs text-blue-100">
                    {selectedSale.invoice_number}
                  </p>
                </div>
              </div>

              <button
                onClick={closeDetails}
                className="rounded-xl p-2 transition hover:bg-white/15"
                aria-label="Close invoice details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {/* Invoice Information */}
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Invoice Number
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {selectedSale.invoice_number}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Invoice Date
                  </p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(selectedSale.created_at)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Payment Status
                  </p>

                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                        selectedSale.current_payment_status
                      )}`}
                    >
                      {selectedSale.current_payment_status || "UNKNOWN"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Sale ID
                  </p>
                  <p className="mt-2 font-semibold text-gray-900">
                    #{selectedSale.id}
                  </p>
                </div>
              </section>

              {/* Purchased Products */}
              <section className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShoppingBag
                        size={18}
                        className="text-blue-600"
                      />
                      <h3 className="font-bold text-gray-900">
                        Purchased Products
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Items included in this invoice.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {selectedSale.items?.length || 0} items
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="bg-white text-xs font-bold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Variant ID</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3 text-right">
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {(selectedSale.items || []).map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                              <Package
                                size={15}
                                className="text-gray-400"
                              />
                              {item.variant_id}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-medium text-gray-700">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {money(item.unit_price)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-gray-900">
                            {money(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!selectedSale.items ||
                  selectedSale.items.length === 0) && (
                  <p className="p-8 text-center text-sm text-gray-500">
                    No product details available.
                  </p>
                )}
              </section>

              {/* Payment Summary */}
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet size={19} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900">
                    Payment Summary
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Subtotal</span>
                    <strong className="text-gray-900">
                      {money(selectedSale.subtotal)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Discount</span>
                    <strong className="text-orange-600">
                      - {money(selectedSale.discount)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 text-base">
                    <span className="font-bold text-gray-800">
                      Total Amount
                    </span>
                    <strong className="text-lg font-extrabold text-blue-700">
                      {money(selectedSale.total_amount)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Paid at Sale</span>
                    <strong className="text-gray-900">
                      {money(selectedSale.paid_amount)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-emerald-700">
                    <span>Current Total Paid</span>
                    <strong>
                      {money(selectedSale.current_paid_amount)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 text-orange-700">
                    <span className="font-bold">
                      Current Outstanding
                    </span>
                    <strong className="text-lg font-extrabold">
                      {money(selectedSale.current_outstanding)}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Download */}
              <button
                onClick={() => downloadInvoice(selectedSale.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Download size={18} />
                Download Invoice PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
