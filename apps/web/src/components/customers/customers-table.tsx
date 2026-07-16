"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, ChevronLeft, ChevronRight, UserPlus,
  TrendingDown, MoreHorizontal, Eye, Edit, Trash2, Navigation, UserX,
} from "lucide-react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { CustomerForm } from "./customer-form";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, btnPrimary, btnSecondary, thClass, cardClass, rowBtnClass,
} from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

export function CustomersTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { readOnly } = usePermissions();
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
    <div>
      <PageHeader
        title="Mijozlar"
        subtitle={meta ? `${meta.total} ta mijoz${zoneFilter ? ` · ${zoneFilter} hududi` : ""}` : "Yuklanmoqda..."}
      >
        <Link href="/inactive" className={btnSecondary}>
          <UserX className="w-4 h-4 flex-none" />
          <span className="hidden sm:inline">Yo'qolayotganlar</span>
        </Link>
        <button
          onClick={() => { setDebtorsOnly(!debtorsOnly); setPage(1); }}
          className={cn(
            btnSecondary,
            debtorsOnly && "!bg-amber-50 dark:!bg-amber-500/15 !text-amber-600 dark:!text-amber-300 !border-amber-200 dark:!border-amber-500/30"
          )}
        >
          <TrendingDown className="w-4 h-4 flex-none" />
          <span className="hidden sm:inline">Qarzdorlar</span>
        </button>
        {!readOnly && (
          <button onClick={() => setShowForm(true)} className={btnPrimary}>
            <UserPlus className="w-4 h-4 flex-none" />
            Yangi mijoz
          </button>
        )}
      </PageHeader>

      {/* Qidiruv + hudud chiplari */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2.5 h-10 px-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[11px] flex-1 min-w-[200px] max-w-sm focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-colors">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ism, telefon yoki manzil..."
            className="bg-transparent text-[13.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        {zones.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setZoneFilter(""); setPage(1); }}
              className={cn(
                "px-3.5 py-[7px] rounded-[10px] text-[13px] font-semibold transition-all whitespace-nowrap",
                zoneFilter === ""
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Barchasi
            </button>
            {zones.map((z) => (
              <button
                key={z}
                onClick={() => { setZoneFilter(zoneFilter === z ? "" : z); setPage(1); }}
                className={cn(
                  "px-3.5 py-[7px] rounded-[10px] text-[13px] font-semibold transition-all whitespace-nowrap",
                  zoneFilter === z
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Jadval */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[840px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Mijoz</th>
                <th className={thClass}>Telefon</th>
                <th className={thClass}>Hudud / Manzil</th>
                <th className={cn(thClass, "text-center")}>Tara (uyida)</th>
                <th className={cn(thClass, "text-right")}>Balans</th>
                <th className={thClass}>Holat</th>
                <th className={cn(thClass, "pr-5")}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-400/70 dark:border-gray-600">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${55 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-gray-400 dark:text-gray-500">Mijoz topilmadi</p>
                    {search && (
                      <p className="text-xs text-gray-400 mt-1">"{search}" bo'yicha natija yo'q</p>
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
                    readOnly={readOnly}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sahifalash */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                      "w-8 h-8 flex items-center justify-center rounded-[9px] text-xs font-semibold transition-colors tabular-nums",
                      page === p
                        ? "bg-blue-600 text-white"
                        : "border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
  customer, onDelete, openMenu, setOpenMenu, readOnly,
}: {
  customer: Customer;
  onDelete: (id: string, name: string) => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  readOnly?: boolean;
}) {
  const balance = Number(customer.balance);
  const isDebtor = balance < 0;

  return (
    <tr className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
      {/* Mijoz: avatar + ism + buyurtma soni */}
      <td className="px-4 pl-5 py-3">
        <Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Avatar name={customer.name} size={38} />
          <div className="min-w-0">
            {/* Hudud chipi olib tashlangan (egasi so'rovi) — hudud alohida ustunda bor */}
            <span className="block text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap max-w-[160px] truncate">
              {customer.name}
            </span>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {customer._count?.orders ?? 0} buyurtma
              {/* Mijoz turi (Uy/Do'kon/Ofis...) — ism ostida kichik yozuv */}
              {customer.customerType && (
                <span className="text-amber-600 dark:text-amber-400 font-medium"> · {customer.customerType}</span>
              )}
            </div>
          </div>
        </Link>
      </td>

      {/* Telefon */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="font-mono text-[12.5px] text-gray-500 dark:text-gray-400">{formatPhone(customer.phone)}</div>
        {customer.phone2 && (
          <div className="font-mono text-[12.5px] text-gray-400 dark:text-gray-600 mt-0.5">{formatPhone(customer.phone2)}</div>
        )}
      </td>

      {/* Hudud / manzil */}
      <td className="px-4 py-3">
        <div className="text-[13px] text-gray-900 dark:text-white font-medium whitespace-nowrap">
          {customer.zone || "—"}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-px max-w-[200px] truncate">
          {customer.address}
          {customer.locationLink && (
            <span
              role="link"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(customer.locationLink, "_blank"); }}
              className="inline-flex items-center gap-0.5 ml-1.5 text-green-600 dark:text-green-400 hover:underline cursor-pointer font-medium"
            >
              <Navigation className="w-3 h-3" />
              Lokatsiya
            </span>
          )}
        </div>
      </td>

      {/* Tara (uyida) */}
      <td className="px-4 py-3 text-center text-[13.5px] font-semibold text-gray-900 dark:text-white tabular-nums">
        {customer.bottlesOwned}
      </td>

      {/* Balans */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={cn(
          "text-[13.5px] font-bold tabular-nums",
          isDebtor ? "text-red-500" : balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
        )}>
          {isDebtor ? "−" : balance > 0 ? "+" : ""}
          {formatCurrency(Math.abs(balance))}
        </span>
      </td>

      {/* Holat */}
      <td className="px-4 py-3">
        {!customer.isActive ? (
          <Pill tone="muted">Nofaol</Pill>
        ) : isDebtor ? (
          <Pill tone="danger">Qarzdor</Pill>
        ) : (
          <Pill tone="success">Faol</Pill>
        )}
      </td>

      {/* Amallar */}
      <td className="px-4 pr-5 py-3 text-right">
        <div className="inline-flex items-center gap-0.5">
          <Link href={`/customers/${customer.id}`} title="Ko'rish" className={rowBtnClass}>
            <Eye className="w-4 h-4" />
          </Link>
          {!readOnly && (
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === customer.id ? null : customer.id)}
              title="Boshqa"
              className={rowBtnClass}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {openMenu === customer.id && (
              <div className="absolute right-0 top-9 z-10 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-card-hover overflow-hidden">
                <Link
                  href={`/customers/${customer.id}`}
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Ko'rish / Tahrir
                </Link>
                <button
                  onClick={() => onDelete(customer.id, customer.name)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  O'chirish
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </td>
    </tr>
  );
}
