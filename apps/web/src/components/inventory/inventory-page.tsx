"use client";

import { useState } from "react";
import {
  Package, Archive, Hammer, HelpCircle, PackagePlus,
  PackageX, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  ChevronLeft, ChevronRight, History, Droplet,
} from "lucide-react";
import { useInventory, useInventoryHistory } from "@/hooks/use-inventory";
import { IntakeModal } from "./intake-modal";
import { MoveStockModal } from "./move-stock-modal";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, StatCard, StatStrip, Donut, Ring, Pill,
  btnPrimary, btnSecondary, thClass, cardClass,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

const TYPE_META: Record<string, { label: string; icon: any; tone: Tone }> = {
  EMPTY_BOTTLE:  { label: "Ombordagi tara", icon: Archive, tone: "warning" },
  BROKEN_BOTTLE: { label: "Singan", icon: Hammer, tone: "danger" },
  LOST_BOTTLE:   { label: "Yo'qolgan", icon: HelpCircle, tone: "muted" },
  FULL_BOTTLE:   { label: "To'la tara (eski)", icon: Droplet, tone: "primary" },
};

const ACTION_LABELS: Record<string, string> = {
  INTAKE: "Qabul",
  DELIVERY: "Yetkazib berish",
  RETURN: "Qaytarish",
  ADJUSTMENT: "Tuzatish",
  BROKEN: "Singan",
  LOST: "Yo'qolgan",
};

// Donut segment ranglari — dizayndagi qiymatlar
const SEG_COLORS = { warehouse: "#F59E0B", customers: "#B93B3B", broken: "#EF4444", lost: "#9CA3AF" };

export function InventoryPage() {
  const [showIntake, setShowIntake] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const { readOnly } = usePermissions();
  const { data: inv, isLoading, refetch } = useInventory();
  const { data: history } = useInventoryHistory(historyPage);

  const inWarehouse = inv?.warehouseBottles ?? 0;  // omborda (sotilmagan bo'sh)
  const atCustomers = inv?.customerBottles ?? 0;   // mijozlarda (aylanma)
  const broken = inv?.brokenBottles ?? 0;
  const lost = inv?.lostBottles ?? 0;
  const total = inv?.totalBottles ?? (inWarehouse + atCustomers + broken + lost);
  const usable = inv?.usableBottles ?? (inWarehouse + atCustomers);

  const segments = [
    { label: "Omborda", value: inWarehouse, color: SEG_COLORS.warehouse },
    { label: "Mijozlarda", value: atCustomers, color: SEG_COLORS.customers },
    { label: "Singan", value: broken, color: SEG_COLORS.broken },
    { label: "Yo'qolgan", value: lost, color: SEG_COLORS.lost },
  ];

  const whPct = usable > 0 ? inWarehouse / usable : 0;

  return (
    <div>
      <PageHeader
        title="Ombor"
        subtitle={inv ? `${inWarehouse} omborda · ${atCustomers} mijozlarda · jami ${total} ta tara` : "Yuklanmoqda..."}
      >
        <button
          onClick={() => refetch()}
          title="Yangilash"
          className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {!readOnly && (
          <>
            <button onClick={() => setShowMove(true)} className={btnSecondary}>
              <PackageX className="w-4 h-4 flex-none" />
              <span className="hidden sm:inline">Singan/Yo'qolgan</span>
            </button>
            <button onClick={() => setShowIntake(true)} className={btnPrimary}>
              <PackagePlus className="w-4 h-4 flex-none" />
              Ombor tarasi
            </button>
          </>
        )}
      </PageHeader>

      {/* Stat strip */}
      <StatStrip>
        <StatCard label="Omborda (bo'sh)" value={inWarehouse} unit="dona" icon={Archive} tone="warning" loading={isLoading} />
        <StatCard label="Mijozlarda" value={atCustomers} unit="dona" icon={Droplet} tone="primary" loading={isLoading} />
        <StatCard label="Singan" value={broken} unit="dona" icon={Hammer} tone="danger" loading={isLoading} />
        <StatCard label="Yo'qolgan" value={lost} unit="dona" icon={HelpCircle} tone="muted" loading={isLoading} />
      </StatStrip>

      {/* Tara taqsimoti (donut) + Ombor sig'imi (ring) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Tara taqsimoti</h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5 mb-3">Barcha taralar qayerda ekani</p>
          <div className="flex items-center gap-6 flex-wrap">
            <Donut segments={segments} size={170} thick={21}>
              <span className="text-[11px] text-gray-400">Jami</span>
              <span className="text-[22px] font-bold text-gray-900 dark:text-white tabular-nums">{total}</span>
              <span className="text-[11px] text-gray-400">dona</span>
            </Donut>
            <div className="flex-1 min-w-[130px] flex flex-col gap-2.5">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className="w-[9px] h-[9px] rounded-[3px] flex-none" style={{ background: s.color }} />
                  <span className="flex-1 text-[13px] text-gray-500 dark:text-gray-400 font-medium">{s.label}</span>
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(cardClass, "p-5 flex flex-col items-center text-center")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight self-start">
            Taralar qayerda?
          </h2>
          <Ring pct={whPct} size={150} thick={14} colorClass="text-blue-600 dark:text-blue-400">
            <span className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">
              {Math.round(whPct * 100)}%
            </span>
            <span className="text-[11px] text-gray-400">omborda</span>
          </Ring>
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-2 tabular-nums">
            Omborda <b className="text-gray-900 dark:text-white">{inWarehouse}</b> · Mijozlarda{" "}
            <b className="text-gray-900 dark:text-white">{atCustomers}</b> · Ishlaydigan{" "}
            <b className="text-gray-900 dark:text-white">{usable}</b>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 max-w-sm leading-relaxed">
            Mijoz yangi tara sotib olsa — ombordan chiqib, mijozning aylanma tarasiga qo'shiladi.
            Almashtirish (to'ldirish) omborga ta'sir qilmaydi. Yangi tara sotib olsangiz "Ombor tarasi" tugmasi orqali qo'shing.
          </p>
        </div>
      </div>

      {/* Harakatlar tarixi */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Harakatlar tarixi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Tur</th>
                <th className={thClass}>Amal</th>
                <th className={cn(thClass, "text-center")}>Miqdor</th>
                <th className={thClass}>Izoh</th>
                <th className={cn(thClass, "pr-5")}>Sana</th>
              </tr>
            </thead>
            <tbody>
              {!history?.data?.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
                    Harakatlar yo'q
                  </td>
                </tr>
              ) : history.data.map((action) => {
                const meta = TYPE_META[action.inventory.type];
                const isPositive = action.quantity > 0;
                return (
                  <tr key={action.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 pl-5 py-3">
                      <Pill tone={meta?.tone || "muted"}>
                        <meta.icon className="w-3 h-3" />
                        {meta?.label}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400">
                      {ACTION_LABELS[action.actionType] || action.actionType}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[13.5px] font-bold tabular-nums",
                        isPositive ? "text-green-600 dark:text-green-400" : "text-red-500"
                      )}>
                        {isPositive ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                        {isPositive ? "+" : ""}{action.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[240px] truncate">
                      {action.description || "—"}
                    </td>
                    <td className="px-4 pr-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(action.createdAt, "dd.MM.yyyy HH:mm")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {history?.meta && history.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {(historyPage - 1) * history.meta.limit + 1}–{Math.min(historyPage * history.meta.limit, history.meta.total)} / {history.meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHistoryPage(historyPage - 1)}
                disabled={historyPage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500 tabular-nums">{historyPage} / {history.meta.totalPages}</span>
              <button
                onClick={() => setHistoryPage(historyPage + 1)}
                disabled={historyPage >= history.meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showIntake && <IntakeModal current={inWarehouse} onClose={() => setShowIntake(false)} />}
      {showMove && <MoveStockModal emptyCount={inWarehouse} onClose={() => setShowMove(false)} />}
    </div>
  );
}
