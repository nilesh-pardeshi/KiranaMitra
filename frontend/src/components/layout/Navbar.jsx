
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  X,
  Package,
  Users,
  Truck,
  LoaderCircle,
  ArrowRight,
  Command,
  UserRound,
  ChevronDown,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  const searchRef = useRef(null);
  const containerRef = useRef(null);
  const accountRef = useRef(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const firstName =
    user?.full_name?.trim().split(/\s+/)[0] || "Admin";

  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  // Build the complete profile image URL.
  const profileImageUrl = user?.profile_image_url
    ? user.profile_image_url.startsWith("http")
      ? user.profile_image_url
      : `${api.defaults.baseURL.replace(/\/+$/, "")}${user.profile_image_url}`
    : null;

  // Reset image error when the profile picture changes.
  useEffect(() => {
    setProfileImageError(false);
  }, [profileImageUrl]);

  const searchStore = useCallback(async (query, signal) => {
    const keyword = query.trim().toLowerCase();

    if (keyword.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    setSearching(true);
    setSearchError("");

    try {
      const [productsRes, customersRes, suppliersRes] =
        await Promise.all([
          api.get("/api/products/", { signal }),
          api.get("/api/customers/", { signal }),
          api.get("/api/suppliers/", { signal }),
        ]);

      if (signal.aborted) return;

      const products = getArray(productsRes.data);
      const customers = getArray(customersRes.data);
      const suppliers = getArray(suppliersRes.data);

      const matches = [];

      products.forEach((product) => {
        const productName = String(product.name || "");
        const category = String(product.category || "");

        const matchingVariants = Array.isArray(product.variants)
          ? product.variants.filter((variant) =>
              `${variant.brand || ""} ${variant.variant_name || ""}`
                .toLowerCase()
                .includes(keyword)
            )
          : [];

        const productMatches =
          `${productName} ${category}`.toLowerCase().includes(keyword);

        if (productMatches || matchingVariants.length > 0) {
          matches.push({
            id: `product-${product.id}`,
            type: "Product",
            title: productName || "Unnamed Product",
            subtitle: category || "Product",
            icon: Package,
            path: "/products",
          });
        }
      });

      customers.forEach((customer) => {
        const searchable = [
          customer.name,
          customer.phone,
          customer.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (searchable.includes(keyword)) {
          matches.push({
            id: `customer-${customer.id}`,
            type: "Customer",
            title: customer.name || "Unnamed Customer",
            subtitle: customer.phone || "Customer account",
            icon: Users,
            path: "/customers",
          });
        }
      });

      suppliers.forEach((supplier) => {
        const searchable = [
          supplier.name,
          supplier.phone,
          supplier.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (searchable.includes(keyword)) {
          matches.push({
            id: `supplier-${supplier.id}`,
            type: "Supplier",
            title: supplier.name || "Unnamed Supplier",
            subtitle: supplier.phone || "Supplier account",
            icon: Truck,
            path: "/suppliers",
          });
        }
      });

      setResults(matches.slice(0, 12));
    } catch (err) {
      if (signal.aborted || err.code === "ERR_CANCELED") return;

      setResults([]);
      setSearchError(
        "Unable to search your store. Check your backend connection."
      );
    } finally {
      if (!signal.aborted) {
        setSearching(false);
      }
    }
  }, []);

  // Debounce search requests.
  useEffect(() => {
    if (!searchOpen) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      searchStore(search, controller.signal);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, searchOpen, searchStore]);

  // Ctrl + K opens global search.
  useEffect(() => {
    function handleShortcut(event) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        setAccountOpen(false);
        searchRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  // Close menus when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }

      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close dropdowns and clear search after changing routes.
  useEffect(() => {
    setSearchOpen(false);
    setNotificationOpen(false);
    setAccountOpen(false);
    setSearch("");
    setResults([]);
  }, [location.pathname]);

  function handleResultClick(result) {
    navigate(result.path, {
      state: {
        globalSearch: search.trim(),
        selectedResultId: result.id,
      },
    });

    setSearchOpen(false);
    setSearch("");
    setResults([]);
  }

  function handleLogout() {
    setAccountOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-6">

      {/* Left section */}
      <div className="flex min-w-0 flex-1 items-center gap-3">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-xl p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
        >
          <Menu size={22} />
        </button>

        {/* Global search */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[460px]"
        >
          <div
            className={`flex h-11 items-center gap-3 rounded-xl border px-3 transition-all duration-200 ${
              searchOpen
                ? "border-emerald-400 bg-white shadow-lg shadow-emerald-900/5 ring-4 ring-emerald-50"
                : "border-transparent bg-slate-100 hover:border-slate-200 hover:bg-white"
            }`}
          >
            <Search
              size={19}
              className="shrink-0 text-slate-400"
            />

            <input
              ref={searchRef}
              type="search"
              value={search}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search products, customers, suppliers..."
              aria-label="Search your store"
              aria-expanded={searchOpen}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

            {search.length > 0 ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setResults([]);
                  setSearchError("");
                  searchRef.current?.focus();
                }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            ) : (
              <div className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-400 sm:flex">
                <Command size={11} />
                K
              </div>
            )}
          </div>

          {/* Search results */}
          {searchOpen && search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">

              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Store Search
                </p>

                <span className="text-xs text-slate-400">
                  {searching ? "Searching..." : `${results.length} results`}
                </span>
              </div>

              {searching ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                  <LoaderCircle
                    size={19}
                    className="animate-spin text-emerald-600"
                  />
                  Searching your store...
                </div>
              ) : searchError ? (
                <div className="p-6 text-center text-sm text-red-600">
                  {searchError}
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center">
                  <Search
                    size={30}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="font-semibold text-slate-700">
                    No matching records
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Try another product, customer or supplier name.
                  </p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {results.map((result) => {
                    const Icon = result.icon;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                      >
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition group-hover:bg-white group-hover:text-emerald-700">
                          <Icon size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {result.title}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {result.type} · {result.subtitle}
                          </p>
                        </div>

                        <ArrowRight
                          size={17}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                <p className="text-[11px] text-slate-400">
                  Search across your products, customers and suppliers.
                </p>
              </div>
            </div>
          )}

          {searchOpen && search.trim().length < 2 && (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <p className="text-xs text-slate-500">
                Type at least 2 characters to search your store.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationOpen((previous) => !previous);
              setSearchOpen(false);
              setAccountOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={notificationOpen}
            className={`relative rounded-xl p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              notificationOpen
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Bell size={20} />
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-emerald-700" />

                <h3 className="font-bold text-slate-800">
                  Notifications
                </h3>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                No new notifications.
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Stock alerts and business notifications will be shown here when notification functionality is connected.
              </p>
            </div>
          )}
        </div>

        {/* Account dropdown */}
        <div className="relative" ref={accountRef}>

          <button
            type="button"
            onClick={() => {
              setAccountOpen((previous) => !previous);
              setNotificationOpen(false);
              setSearchOpen(false);
            }}
            aria-expanded={accountOpen}
            aria-label="Open account menu"
            className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {/* Navbar profile picture */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-100 to-green-200 text-base font-bold text-emerald-800 ring-2 ring-white">
              {profileImageUrl && !profileImageError ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                initials
              )}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-bold text-slate-900">
                Store Admin - {firstName}
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`hidden text-slate-400 transition sm:block ${
                accountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">

              {/* Account information */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-emerald-50/60 p-4">

                {/* Dropdown profile picture */}
                {profileImageUrl && !profileImageError ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">
                    {user?.full_name || "Store Admin"}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="p-2">

                <button
                  type="button"
                  onClick={() => {
                    navigate("/profile");
                    setAccountOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <UserRound size={18} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/products");
                    setAccountOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Package size={18} />
                  Products
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/customers");
                    setAccountOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Users size={18} />
                  Customers
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/");
                    setAccountOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>

              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
