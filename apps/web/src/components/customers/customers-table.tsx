"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  Phone, MapPin, Package, TrendingDown, MoreHorizontal,
  Edit, Trash2, DollarSign,
} from "lucide-react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { CustomerForm } from "./customer-form";
import { formatCurrency, formatPhone, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CustomersTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data: settings } = useSettings();
  const zones = settings?.zones || [];

  const { data, isLoading } = useCustomers({
    search: debouncedSearch,
    page,
    limit: 20,
    debtorsOnly: debtorsOnly || undefined,
    zone: zoneFilter || undefined,
  });

  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleCreate = async (formData: any) => {
    await createCustomer.mutateAsync(formData);
    setShowForm(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    await deleteCustomer.mutateAsync(id);
    setOpenMenu(null);
  };

  const customers = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mijozlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {meta ? `Jami: ${meta.total} ta mijoz` : "Yuklanmoqda..."}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          Yangi mijoz
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ism, telefon yoki manzil bo'yicha qidirish..."
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        <button
          onClick={() => { setDebtorsOnly(!debtorsOnly); setPage(1); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
            debtorsOnly
              ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-gray-300"
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Qarzdorlar
        </button>
      </div>

      {/* Zone filter */}
      {zones.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Hudud:</span>
          <button
            onClick={() => { setZoneFilter(""); setPage(1); }}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", zoneFilter === "" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300")}
          >
            Barchasi
          </button>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => { setZoneFilter(zoneFilter === z ? "" : z); setPage(1); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", zoneFilter === z ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300")}
            >
              {z}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                {["Mijoz", "Telefon", "Manzil", "Taralar", "Balans", "Buyurtmalar", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-gray-400 dark:text-gray-500">Mijoz topilmadi</p>
                    {search && (
                      <p className="text-xs text-gray-400 mt-1">
                        "{search}" bo'yicha natija yo'q
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    onDelete={handleDelete}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 5) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      page === p
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          title="Yangi mijoz qo'shish"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isLoading={createCustomer.isPending}
        />
      )}
    </div>
  );
}

function CustomerRow({
  customer, onDelete, openMenu, setOpenMenu,
}: {
  customer: Customer;
  onDelete: (id: string, name: string) => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
}) {
  const bottlesOwed = customer.bottlesGiven - customer.bottlesReturned;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
      {/* Name + avatar */}
      <td className="px-5 py-3">
        <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-xs flex-shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{customer.name}</p>
              {customer.zone && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold flex-shrink-0">{customer.zone}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {customer.locationLink && (
                <span
                  role="link"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(customer.locationLink, "_blank"); }}
                  className="text-green-600 dark:text-green-400 hover:underline mr-2 cursor-pointer"
                >📍 Lokatsiya</span>
              )}
              ID: {customer.id.slice(0, 8)}
            </p>
          </div>
        </Link>
      </td>

      {/* Phone */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-gray-700 dark:text-gray-300 text-xs font-mono">{formatPhone(customer.phone)}</span>
        </div>
        {customer.phone2 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">{formatPhone(customer.phone2)}</span>
          </div>
        )}
      </td>

      {/* Address */}
      <td className="px-5 py-3">
        <div className="flex items-start gap-1.5 max-w-[180px]">
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">{customer.address}</span>
        </div>
      </td>

      {/* Bottles */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Berilgan: <span className="font-medium">{customer.bottlesGiven}</span>
            </p>
            <p className="text-xs text-gray-400">
              Qaytarilgan: {customer.bottlesReturned}
              {bottlesOwed > 0 && (
                <span className="ml-1 text-orange-500 font-medium">({bottlesOwed} qoldi)</span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Balance */}
      <td className="px-5 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-semibold",
            customer.balance < 0 ? "text-red-500" : customer.balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-500"
          )}
        >
          {customer.balance < 0 ? "-" : customer.balance > 0 ? "+" : ""}
          {formatCurrency(Math.abs(Number(customer.balance)))}
        </span>
        {customer.balance < 0 && (
          <p className="text-xs text-red-400 mt-0.5">Qarzdor</p>
        )}
      </td>

      {/* Orders count */}
      <td className="px-5 py-3">
        <Link href={`/customers/${customer.id}`} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
          {customer._count?.orders ?? 0} ta
        </Link>
      </td>

      {/* Actions */}
      <td className="px-5 py-3">
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === customer.id ? null : customer.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {openMenu === customer.id && (
            <div className="absolute right-0 top-9 z-10 w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-950/50 overflow-hidden">
              <Link
                href={`/customers/${customer.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Ko'rish / Tahrir
              </Link>
              <button
                onClick={() => onDelete(customer.id, customer.name)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                O'chirish
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
