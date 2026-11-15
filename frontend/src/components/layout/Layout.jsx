
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const pageNames = {
  "/": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/suppliers": "Suppliers",
  "/purchases": "Purchases",
  "/customers": "Customers & Udhar",
  "/sales": "Sales & Billing",
  "/invoices": "Invoice History",
  "/reports": "Business Reports",
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentPage =
    pageNames[location.pathname] || "KiranaMitra";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f5f8f7] text-slate-800">

      {/* Soft background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-lime-100/30 blur-3xl" />
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main application */}
      <div className="relative min-h-screen lg:pl-64">

        {/* Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main
          key={location.pathname}
          className="relative min-h-[calc(100vh-72px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {/* Page context */}
          <div className="mb-4 hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span>KiranaMitra</span>
            <span>/</span>
            <span className="font-semibold text-emerald-700">
              {currentPage}
            </span>
          </div>

          <div className="mx-auto w-full max-w-[1600px] animate-[fadeIn_250ms_ease-out]">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative border-t border-slate-200/70 bg-white/60 px-5 py-4 text-center sm:text-left">
          <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-1 text-xs text-slate-400 sm:flex-row">
            <span>
              © {new Date().getFullYear()} KiranaMitra. Smart Store Management.
            </span>
            <span>
              Built for smarter kirana businesses.
            </span>
          </div>
        </footer>
      </div>

      {/* Page transition animation */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
