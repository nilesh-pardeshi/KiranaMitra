
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  Users,
  Receipt,
  FileText,
  BarChart3,
  Store,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Products", path: "/products", icon: Package },
  { name: "Inventory", path: "/inventory", icon: Boxes },
  { name: "Suppliers", path: "/suppliers", icon: Truck },
  { name: "Purchases", path: "/purchases", icon: ShoppingCart },
  { name: "Customers & Udhar", path: "/customers", icon: Users },
  { name: "Sales & Billing", path: "/sales", icon: Receipt },
  { name: "Invoices", path: "/invoices", icon: FileText },
  { name: "Reports", path: "/reports", icon: BarChart3 },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand */}
      <div className="relative overflow-hidden border-b border-slate-100 px-5 py-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-100/70 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-800 text-white shadow-lg shadow-emerald-800/20">
              <Store size={25} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                KiranaMitra
              </h1>

              <p className="text-[11px] font-medium text-slate-500">
                Smart Store Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-4 flex items-center justify-between px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Main Menu
          </p>

          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
            Store
          </span>
        </div>

        <div className="space-y-1.5">
          {menuItems.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 shadow-sm shadow-emerald-900/5"
                    : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-50 hover:text-emerald-700"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-600" />
                  )}

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-700/20"
                        : "bg-slate-100/80 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.3 : 1.9}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                  </span>

                  <span className="min-w-0 flex-1 truncate">
                    {name}
                  </span>

                  {isActive ? (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-emerald-600"
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-transparent transition group-hover:bg-emerald-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Store information */}
      <div className="border-t border-slate-100 p-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 p-4 text-white shadow-lg shadow-emerald-900/15">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10 blur-xl" />

          <div className="relative flex items-center gap-2">
            <div className="rounded-lg bg-white/15 p-2">
              <Sparkles size={17} />
            </div>

            <div>
              <p className="text-xs font-bold">
                Smarter Store
              </p>
              <p className="text-[10px] text-emerald-100">
                Better business management
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-between border-t border-white/15 pt-3">
            <span className="text-[10px] font-medium text-emerald-100">
              KiranaMitra v1.0
            </span>

            <span className="rounded-md bg-white/15 px-2 py-1 text-[9px] font-bold text-white">
              ACTIVE
            </span>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} KiranaMitra
        </p>
      </div>
    </aside>
  );
}
