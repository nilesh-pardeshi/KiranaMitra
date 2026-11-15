
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  X,
  Phone,
  MapPin,
  Wallet,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  BookOpen,
  UserRound,
  IndianRupee,
  CalendarDays,
  ReceiptText,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  History,
  TrendingUp,
} from "lucide-react";

import api from "../services/api";
import Loader from "../components/common/Loader";

const emptyCustomer = {
  name: "",
  phone: "",
  address: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Customers() {
  const location = useLocation();
  const selectedResultId = location.state?.selectedResultId;

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [savingTransaction, setSavingTransaction] = useState(false);

  async function loadCustomers() {
    try {
      setLoading(true);

      const response = await api.get("/api/customers/");
      setCustomers(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Apply the customer search term received from the global Navbar search.
  useEffect(() => {
    const globalSearch = location.state?.globalSearch;

    if (globalSearch) {
      setSearch(globalSearch);
    }
  }, [location.key, location.state]);

  async function createCustomer(event) {
    event.preventDefault();

    if (customerForm.name.trim().length < 2) {
      setError("Customer name must contain at least 2 characters.");
      return;
    }

    setSavingCustomer(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/customers/", {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || null,
        address: customerForm.address.trim() || null,
      });

      setSuccess("Customer registered successfully.");
      setCustomerForm(emptyCustomer);
      setShowCustomerForm(false);

      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to register customer."
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function openCustomer(customer) {
    setSelectedCustomer(customer);
    setLedger(null);
    setTransactionType("");
    setError("");
    setLoadingLedger(true);

    try {
      const response = await api.get(
        `/api/customers/${customer.id}/ledger`
      );

      setLedger(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load customer ledger."
      );
    } finally {
      setLoadingLedger(false);
    }
  }

  async function refreshLedger() {
    if (!selectedCustomer) return;

    try {
      setLoadingLedger(true);

      const [ledgerResponse, customersResponse] = await Promise.all([
        api.get(`/api/customers/${selectedCustomer.id}/ledger`),
        api.get("/api/customers/"),
      ]);

      setLedger(ledgerResponse.data);
      setCustomers(customersResponse.data);

      const updatedCustomer = customersResponse.data.find(
        (customer) => customer.id === selectedCustomer.id
      );

      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to refresh account."
      );
    } finally {
      setLoadingLedger(false);
    }
  }

  function openTransaction(type) {
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setError("");
    setSuccess("");
  }

  async function submitTransaction(event) {
    event.preventDefault();

    if (!selectedCustomer || Number(amount) <= 0) {
      setError("Please enter a valid transaction amount.");
      return;
    }

    setSavingTransaction(true);
    setError("");
    setSuccess("");

    try {
      if (transactionType === "UDHAR") {
        await api.post(
          `/api/customers/${selectedCustomer.id}/udhar`,
          {
            amount: Number(amount),
            description: description.trim() || "Credit purchase",
          }
        );

        setSuccess("Udhar transaction recorded successfully.");
      } else {
        await api.post(
          `/api/customers/${selectedCustomer.id}/repayments`,
          {
            amount: Number(amount),
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || null,
          }
        );

        setSuccess("Repayment recorded successfully.");
      }

      setTransactionType("");
      setAmount("");

      await refreshLedger();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to record transaction."
      );
    } finally {
      setSavingTransaction(false);
    }
  }

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.phone || ""} ${customer.address || ""}`
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      ),
    [customers, search]
  );

  const totalOutstanding = customers.reduce(
    (sum, customer) =>
      sum + Number(customer.outstanding_balance || 0),
    0
  );

  const customersWithUdhar = customers.filter(
    (customer) => Number(customer.outstanding_balance || 0) > 0
  ).length;

  const customersWithoutUdhar = customers.length - customersWithUdhar;

  if (loading) {
    return <Loader text="Loading customers..." />;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-green-600 to-teal-500 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90">
              <Users size={14} />
              CUSTOMER MANAGEMENT
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Customers & Udhar
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
              Manage customer accounts, track credit purchases,
              and record repayments with ease.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setCustomerForm(emptyCustomer);
              setShowCustomerForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            <Plus size={19} />
            Add Customer
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
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-1 transition hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Users size={22} />
            </div>
            <span className="text-xs font-semibold text-blue-600">
              CUSTOMER BASE
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Customers
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-gray-900">
            {customers.length}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Registered customer accounts
          </p>
        </div>

        <div className="group rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
              <Wallet size={22} />
            </div>
            <span className="text-xs font-semibold text-orange-600">
              CREDIT BALANCE
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-gray-500">
            Total Outstanding
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-orange-700">
            {money(totalOutstanding)}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Total pending customer payments
          </p>
        </div>

        <div className="group rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
              <CreditCard size={22} />
            </div>
            <span className="text-xs font-semibold text-purple-600">
              CREDIT USERS
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-gray-500">
            Customers with Udhar
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-gray-900">
            {customersWithUdhar}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Customers with pending balances
          </p>
        </div>

        <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              CLEAR ACCOUNTS
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-gray-500">
            No Outstanding
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-gray-900">
            {customersWithoutUdhar}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Customers with zero pending balance
          </p>
        </div>
      </section>

      {/* Customer List */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <BookOpen size={19} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Customer Accounts
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select a customer to view their ledger and manage Udhar.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {filteredCustomers.length} customers
          </span>
        </div>

        <div className="border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
            <Search size={19} className="shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone or address..."
              className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => {
                const outstanding = Number(
                  customer.outstanding_balance || 0
                );

                return (
                  <tr
                    key={customer.id}
                    className={`group transition-colors hover:bg-emerald-50/40 ${
                      selectedResultId != null &&
                      String(customer.id) === String(selectedResultId)
                        ? "bg-amber-50 ring-2 ring-inset ring-amber-400"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 font-bold text-emerald-700">
                          {customer.name?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {customer.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            Customer #{customer.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {customer.phone || "-"}
                      </span>
                    </td>

                    <td className="max-w-56 px-6 py-4 text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        <span className="truncate">
                          {customer.address || "-"}
                        </span>
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                          outstanding > 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {money(outstanding)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openCustomer(customer)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
                      >
                        <BookOpen size={15} />
                        View Account
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Users size={30} />
            </div>
            <h3 className="font-bold text-gray-800">
              No customers found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {search
                ? "Try a different name, phone number or address."
                : "Register your first customer to get started."}
            </p>
          </div>
        )}
      </section>

      {/* Register Customer Modal */}
      {showCustomerForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCustomerForm(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <UserRound size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    Register Customer
                  </h2>
                  <p className="mt-0.5 text-xs text-emerald-50">
                    Add a new customer account
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCustomerForm(false)}
                className="rounded-lg p-2 transition hover:bg-white/15"
                aria-label="Close customer form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={createCustomer} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  minLength={2}
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  placeholder="Enter customer full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-50">
                  <Phone size={17} className="text-gray-400" />
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    placeholder="Contact number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Address
                </label>
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-50">
                  <MapPin size={17} className="mt-3 text-gray-400" />
                  <textarea
                    rows={3}
                    value={customerForm.address}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        address: e.target.value,
                      })
                    }
                    className="w-full resize-none bg-transparent py-3 text-sm outline-none"
                    placeholder="Enter customer address"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowCustomerForm(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  disabled={savingCustomer}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCustomer ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Plus size={17} />
                  )}
                  {savingCustomer ? "Saving..." : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Account / Ledger Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCustomer(null);
              setLedger(null);
              setTransactionType("");
              setError("");
              setSuccess("");
            }
          }}
        >
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 shadow-2xl">
            {/* Ledger Header */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 to-teal-600 px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-lg font-extrabold">
                  {selectedCustomer.name?.charAt(0)?.toUpperCase() || "C"}
                </div>

                <div>
                  <h2 className="text-lg font-bold sm:text-xl">
                    {selectedCustomer.name}
                  </h2>
                  <p className="mt-1 text-xs text-emerald-100">
                    Customer account #{selectedCustomer.id}
                    {selectedCustomer.phone
                      ? ` • ${selectedCustomer.phone}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshLedger}
                  disabled={loadingLedger}
                  className="rounded-xl bg-white/15 p-2.5 transition hover:bg-white/25 disabled:opacity-50"
                  title="Refresh ledger"
                  aria-label="Refresh ledger"
                >
                  <RefreshCw
                    size={19}
                    className={loadingLedger ? "animate-spin" : ""}
                  />
                </button>

                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setLedger(null);
                    setTransactionType("");
                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-xl bg-white/15 p-2.5 transition hover:bg-white/25"
                  aria-label="Close customer account"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {loadingLedger ? (
                <div className="rounded-2xl bg-white p-10 shadow-sm">
                  <Loader text="Loading customer account..." />
                </div>
              ) : ledger ? (
                <>
                  {/* Outstanding Balance */}
                  <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-md">
                    <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-50">
                          <Wallet size={18} />
                          Outstanding Udhar Balance
                        </div>
                        <h3 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                          {money(ledger.outstanding_balance)}
                        </h3>
                        <p className="mt-2 text-xs text-orange-50">
                          {Number(ledger.outstanding_balance || 0) > 0
                            ? "Payment is pending from this customer."
                            : "This customer's account is clear."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/15 p-4">
                        <IndianRupee size={34} />
                      </div>
                    </div>
                  </section>

                  {/* Transaction Actions */}
                  <section className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => openTransaction("UDHAR")}
                      className="group flex items-center justify-between rounded-2xl border border-orange-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-orange-100 p-3 text-orange-700 transition group-hover:bg-orange-200">
                          <ArrowDownLeft size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Record Udhar
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Add a credit purchase
                          </p>
                        </div>
                      </div>
                      <Plus size={19} className="text-orange-500" />
                    </button>

                    <button
                      onClick={() => openTransaction("REPAYMENT")}
                      disabled={
                        Number(ledger.outstanding_balance) <= 0
                      }
                      className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 transition group-hover:bg-emerald-200">
                          <ArrowUpRight size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Record Repayment
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Receive customer payment
                          </p>
                        </div>
                      </div>
                      <Plus size={19} className="text-emerald-500" />
                    </button>
                  </section>

                  {/* Transaction Ledger */}
                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <History size={19} className="text-emerald-600" />
                          <h3 className="font-bold text-gray-900">
                            Transaction Ledger
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Complete credit and repayment history.
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        {ledger.entries?.length || 0} entries
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Description</th>
                            <th className="px-5 py-4">Type</th>
                            <th className="px-5 py-4 text-right">Amount</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {(ledger.entries || []).map((entry) => (
                            <tr
                              key={entry.id}
                              className="transition hover:bg-gray-50"
                            >
                              <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays
                                    size={14}
                                    className="text-gray-400"
                                  />
                                  {formatDate(entry.created_at)}
                                </span>
                              </td>

                              <td className="px-5 py-4 font-medium text-gray-700">
                                {entry.description || "-"}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                                    entry.entry_type === "DEBIT"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {entry.entry_type === "DEBIT" ? (
                                    <ArrowDownLeft size={13} />
                                  ) : (
                                    <ArrowUpRight size={13} />
                                  )}
                                  {entry.entry_type}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-gray-900">
                                {money(entry.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {(!ledger.entries || ledger.entries.length === 0) && (
                      <div className="px-5 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                          <ReceiptText size={23} />
                        </div>
                        <p className="font-semibold text-gray-700">
                          No transactions yet
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Customer credit and repayment history will appear here.
                        </p>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <AlertCircle
                    size={30}
                    className="mx-auto mb-3 text-red-400"
                  />
                  <p className="font-semibold text-gray-800">
                    Unable to load this customer ledger.
                  </p>
                  <button
                    onClick={() => openCustomer(selectedCustomer)}
                    className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Transaction Form */}
              {transactionType && (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div
                    className={`flex items-center justify-between px-5 py-4 text-white ${
                      transactionType === "UDHAR"
                        ? "bg-gradient-to-r from-orange-600 to-amber-500"
                        : "bg-gradient-to-r from-emerald-700 to-teal-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/15 p-2">
                        {transactionType === "UDHAR" ? (
                          <ArrowDownLeft size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold">
                          {transactionType === "UDHAR"
                            ? "Record Credit Transaction"
                            : "Record Customer Repayment"}
                        </h3>
                        <p className="mt-0.5 text-xs text-white/80">
                          {selectedCustomer.name}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setTransactionType("")}
                      className="rounded-lg p-2 transition hover:bg-white/15"
                      aria-label="Close transaction form"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <form
                    onSubmit={submitTransaction}
                    className="space-y-4 p-5"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-50">
                        <IndianRupee size={18} className="text-gray-400" />
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-transparent py-3 text-sm outline-none"
                          placeholder="Enter transaction amount"
                        />
                      </div>
                    </div>

                    {transactionType === "UDHAR" ? (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Description
                        </label>
                        <input
                          value={description}
                          onChange={(e) =>
                            setDescription(e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                          placeholder="e.g. Monthly grocery purchase"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Payment Method{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) =>
                              setPaymentMethod(e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                          >
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Reference Number
                          </label>
                          <input
                            value={referenceNumber}
                            onChange={(e) =>
                              setReferenceNumber(e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                            placeholder="Optional UPI/reference number"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setTransactionType("")}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>

                      <button
                        disabled={savingTransaction}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingTransaction ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                        {savingTransaction
                          ? "Saving..."
                          : "Confirm Transaction"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
