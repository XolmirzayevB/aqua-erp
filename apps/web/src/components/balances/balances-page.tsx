"use client";

// ISHCHI PUL BALANSI sahifasi (2026-07-19, egasi so'rovi).
// - Har ishchi (haydovchi/operator/admin) o'z NAQD va KLIK balansini ko'radi
// - Ishchilar bir-biriga pul o'tkazadi: yuborilganda puldan DARROV ayiriladi,
//   qabul qiluvchi "Qabul qilish"ni bosgandagina unga qo'shiladi
// - ADMIN/MANAGER (va operator) — hamma balanslari + umumiy pul
// - Haydovchi faqat O'Z summasini ko'radi (boshqalarning ismi o'tkazma uchun)

import { useState } from "react";
import {
  Banknote, CreditCard, Wallet, SendHorizontal, Check, X as XIcon,
  Loader2, ArrowRight, Undo2, ChevronDown,
} from "lucide-react";
import {
  useBalances, useTransfers, useCreateTransfer, useAcceptTransfer,
  useRejectTransfer, useCancelTransfer, WorkerBalance, WorkerTransfer,
} from "@/hooks/use-balances";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth.store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  PageHeader, StatCard, StatStrip, Avatar, Pill, btnPrimary, cardClass, thClass,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OPERATOR: "Operator",
  DRIVER: "Haydovchi",
};

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Kutilmoqda", tone: "warning" },
  ACCEPTED: { label: "Qabul qilindi", tone: "success" },
  REJECTED: { label: "Rad etildi", tone: "danger" },
  CANCELLED: { label: "Bekor qilindi", tone: "muted" },
};

const bigInput =
  "w-full h-[52px] px-4 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-gray-900 transition-all";

// "naqd" / "klik" nomi va ikonkasi bitta joyda
function methodMeta(method: "CASH" | "CARD") {
  return method === "CASH"
    ? { label: "Naqd", icon: Banknote }
    : { label: "Klik", icon: CreditCard };
}

export function BalancesPage() {
  const { readOnly, isDriver } = usePermissions();
  const me = useAuthStore((s) => s.user);
  const { data: balances, isLoading } = useBalances();
  const { data: transfers } = useTransfers();
  const accept = useAcceptTransfer();
  const reject = useRejectTransfer();
  const cancel = useCancelTransfer();

  const [showTransfer, setShowTransfer] = useState(false);

  const workers = balances?.data || [];
  const totals = balances?.totals;
  const mine = workers.find((w) => w.id === me?.id);

  const pending = transfers?.pending || [];
  const incoming = pending.filter((t) => t.toUserId === me?.id);
  const outgoing = pending.filter((t) => t.fromUserId === me?.id);
  // Admin/menejer boshqalar orasidagi kutilayotganlarni ham ko'radi
  const otherPending = pending.filter((t) => t.toUserId !== me?.id && t.fromUserId !== me?.id);

  const handleAccept = async (t: WorkerTransfer) => {
    if (!confirm(`${t.fromUser.name}dan ${formatCurrency(Number(t.amount))} (${methodMeta(t.method).label.toLowerCase()}) pulni QO'LGA OLDINGIZMI?\n\nQabul qilsangiz balansingizga qo'shiladi.`)) return;
    await accept.mutateAsync(t.id);
  };
  const handleReject = async (t: WorkerTransfer) => {
    if (!confirm(`${t.fromUser.name}dan kelgan ${formatCurrency(Number(t.amount))} o'tkazmani RAD etasizmi? Pul unga qaytadi.`)) return;
    await reject.mutateAsync(t.id);
  };
  const handleCancel = async (t: WorkerTransfer) => {
    if (!confirm(`${t.toUser.name}ga yuborilgan ${formatCurrency(Number(t.amount))} o'tkazmani bekor qilasizmi? Pul sizga qaytadi.`)) return;
    await cancel.mutateAsync(t.id);
  };

  return (
    <div>
      <PageHeader
        title={isDriver ? "Balansim" : "Ishchi balansi"}
        subtitle={isDriver ? "Qo'lingizdagi pul va o'tkazmalar" : "Kimda qancha pul — naqd va klik"}
      >
        {/* Menejer pul o'tkaza olmaydi (faqat ko'radi) */}
        {!readOnly && (
          <button onClick={() => setShowTransfer(true)} className={btnPrimary}>
            <SendHorizontal className="w-4 h-4 flex-none" />
            Pul o'tkazish
          </button>
        )}
      </PageHeader>

      {/* ── UMUMIY PUL — admin/menejer/operator ── */}
      {totals && (
        <div className="mb-4">
          <StatStrip>
            <StatCard label="Jami naqd (qo'llarda)" value={formatCurrency(totals.cash)} icon={Banknote} tone="success" loading={isLoading} />
            <StatCard label="Jami klik" value={formatCurrency(totals.click)} icon={CreditCard} tone="primary" loading={isLoading} />
            <StatCard label="Umumiy pul" value={formatCurrency(totals.cash + totals.click)} icon={Wallet} tone="violet" loading={isLoading} />
          </StatStrip>
          {/* Yo'ldagi pul — yuborilgan, hali qabul qilinmagan o'tkazmalar */}
          {(totals.pendingCash > 0 || totals.pendingClick > 0) && (
            <p className="mt-2 text-[12.5px] text-gray-400 dark:text-gray-500">
              Shundan yo'lda (qabul kutilmoqda):{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatCurrency(totals.pendingCash + totals.pendingClick)}
              </span>
              {" "}— bu pul jamiga qo'shilgan, lekin hozircha hech kimning balansida emas
            </p>
          )}
        </div>
      )}

      {/* ── MENING BALANSIM ── */}
      {mine && (
        <div className={cn(cardClass, "p-5 mb-4")}>
          <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Mening balansim
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-green-100 dark:border-green-500/20 bg-green-50/60 dark:bg-green-500/10 px-4 py-3.5">
              <p className="text-[12.5px] font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" /> Naqd
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                {formatCurrency(Number(mine.cashBalance ?? 0))}
              </p>
            </div>
            <div className="rounded-[14px] border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3.5">
              <p className="text-[12.5px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> Klik
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                {formatCurrency(Number(mine.clickBalance ?? 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MENGA KELGAN O'TKAZMALAR — qabul qilish kutilyapti ── */}
      {incoming.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Sizga yuborilgan — qabul qilishingiz kutilmoqda
          </p>
          {incoming.map((t) => {
            const M = methodMeta(t.method);
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/10">
                <Avatar name={t.fromUser.name} size={38} />
                <div className="flex-1 min-w-[170px]">
                  <p className="text-[14.5px] font-bold text-gray-900 dark:text-white">
                    {t.fromUser.name} sizga {formatCurrency(Number(t.amount))} yubordi
                  </p>
                  <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <M.icon className="w-3.5 h-3.5" /> {M.label}
                    {t.notes ? ` · ${t.notes}` : ""} · {formatDate(t.createdAt, "dd.MM HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(t)}
                    disabled={accept.isPending}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[11px] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[13.5px] font-semibold transition-colors"
                  >
                    {accept.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Qabul qilish
                  </button>
                  <button
                    onClick={() => handleReject(t)}
                    disabled={reject.isPending}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[11px] border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-[13.5px] font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    Rad etish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEN YUBORGAN — qabul kutilyapti ── */}
      {outgoing.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Siz yuborgansiz — qabul qilinishi kutilmoqda
          </p>
          {outgoing.map((t) => {
            const M = methodMeta(t.method);
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <Avatar name={t.toUser.name} size={34} />
                <div className="flex-1 min-w-[170px]">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                    {t.toUser.name}ga {formatCurrency(Number(t.amount))} ({M.label.toLowerCase()})
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Balansingizdan ayirilgan — u qabul qilganda unga o'tadi · {formatDate(t.createdAt, "dd.MM HH:mm")}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(t)}
                  disabled={cancel.isPending}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Bekor qilish
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Boshqalar orasidagi kutilayotganlar (admin/menejer nazorati) ── */}
      {otherPending.length > 0 && !isDriver && (
        <div className="space-y-2 mb-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Boshqa kutilayotgan o'tkazmalar
          </p>
          {otherPending.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[13px] text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{t.fromUser.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{t.toUser.name}</span>
              <span className="tabular-nums font-bold">{formatCurrency(Number(t.amount))}</span>
              <Pill tone="warning">Kutilmoqda</Pill>
            </div>
          ))}
        </div>
      )}

      {/* ── HAMMA ISHCHILAR BALANSI — admin/menejer/operator ── */}
      {totals && (
        <div className={cn(cardClass, "overflow-hidden mb-4")}>
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Ishchilar balansi</h3>
          </div>
          {/* Mobil kartalar */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {workers.map((w) => (
              <WorkerRowMobile key={w.id} w={w} isMe={w.id === me?.id} />
            ))}
          </div>
          {/* Jadval */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={cn(thClass, "pl-5")}>Ishchi</th>
                  <th className={cn(thClass, "text-right")}>Naqd</th>
                  <th className={cn(thClass, "text-right")}>Klik</th>
                  <th className={cn(thClass, "text-right pr-5")}>Jami</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 pl-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.name} size={32} />
                        <div>
                          <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white">
                            {w.name}{w.id === me?.id ? " (men)" : ""}
                          </p>
                          <p className="text-[11.5px] text-gray-400">{ROLE_LABELS[w.role] || w.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-green-700 dark:text-green-400">
                      {formatCurrency(Number(w.cashBalance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatCurrency(Number(w.clickBalance ?? 0))}
                    </td>
                    <td className="px-4 pr-5 py-3 text-right text-[14px] font-bold tabular-nums text-gray-900 dark:text-white">
                      {formatCurrency(Number(w.cashBalance ?? 0) + Number(w.clickBalance ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TARIX ── */}
      {(transfers?.resolved?.length ?? 0) > 0 && (
        <div className={cn(cardClass, "overflow-hidden")}>
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">O'tkazmalar tarixi</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transfers!.resolved.map((t) => {
              const meta = STATUS_META[t.status] || STATUS_META.PENDING;
              const M = methodMeta(t.method);
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-5 py-3">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{t.fromUser.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-none" />
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{t.toUser.name}</span>
                  <span className="text-[13.5px] font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(Number(t.amount))}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                    <M.icon className="w-3.5 h-3.5" />{M.label}
                  </span>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                  <span className="text-[11.5px] text-gray-400 ml-auto">
                    {formatDate(t.resolvedAt || t.createdAt, "dd.MM HH:mm")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTransfer && me && (
        <TransferModal
          meId={me.id}
          myCash={Number(mine?.cashBalance ?? 0)}
          myClick={Number(mine?.clickBalance ?? 0)}
          workers={workers}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}

function WorkerRowMobile({ w, isMe }: { w: WorkerBalance; isMe: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={w.name} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
          {w.name}{isMe ? " (men)" : ""}
        </p>
        <p className="text-[11.5px] text-gray-400">{ROLE_LABELS[w.role] || w.role}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-bold tabular-nums text-gray-900 dark:text-white">
          {formatCurrency(Number(w.cashBalance ?? 0) + Number(w.clickBalance ?? 0))}
        </p>
        <p className="text-[11px] text-gray-400 tabular-nums">
          <span className="text-green-600 dark:text-green-400">{formatCurrency(Number(w.cashBalance ?? 0))}</span>
          {" · "}
          <span className="text-blue-600 dark:text-blue-400">{formatCurrency(Number(w.clickBalance ?? 0))} klik</span>
        </p>
      </div>
    </div>
  );
}

// ── PUL O'TKAZISH modali ──
function TransferModal({
  meId, myCash, myClick, workers, onClose,
}: {
  meId: string; myCash: number; myClick: number;
  workers: WorkerBalance[]; onClose: () => void;
}) {
  const createTransfer = useCreateTransfer();
  const recipients = workers.filter((w) => w.id !== meId);

  const [toUserId, setToUserId] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");

  const amount = Number(amountStr.replace(/\D/g, ""));
  const available = method === "CASH" ? myCash : myClick;
  const canSubmit = !!toUserId && amount > 0 && amount <= available;

  const onAmountChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 12);
    setAmountStr(digits ? new Intl.NumberFormat("uz-UZ").format(Number(digits)) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createTransfer.isPending) return;
    const to = recipients.find((r) => r.id === toUserId);
    if (!confirm(`${to?.name}ga ${formatCurrency(amount)} (${method === "CASH" ? "naqd" : "klik"}) yuborasizmi?\n\nPul balansingizdan darrov ayiriladi, u qabul qilganda unga o'tadi.`)) return;
    await createTransfer.mutateAsync({
      toUserId,
      amount,
      method,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-[16px] flex items-center gap-2">
            <SendHorizontal className="w-4.5 h-4.5 text-blue-500" />
            Pul o'tkazish
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Kimga */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kimga?</label>
            <div className="relative">
              <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}
                className={cn(bigInput, "appearance-none pr-10 cursor-pointer")}>
                <option value="">Ishchini tanlang</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({ROLE_LABELS[r.role] || r.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-[18px] h-[18px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Qaysi pul */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Qaysi puldan?</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "CASH", label: "Naqd", icon: Banknote, bal: myCash, active: "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
                { v: "CARD", label: "Klik", icon: CreditCard, bal: myClick, active: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" },
              ] as const).map((o) => (
                <button key={o.v} type="button" onClick={() => setMethod(o.v)}
                  className={cn(
                    "py-3 px-3 rounded-xl border-2 text-left transition-all",
                    method === o.v ? o.active : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  )}>
                  <span className="flex items-center gap-1.5 text-[13.5px] font-bold">
                    <o.icon className="w-4 h-4" /> {o.label}
                  </span>
                  <span className="block text-[12px] mt-0.5 tabular-nums opacity-80">
                    bor: {formatCurrency(o.bal)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Summa */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Summa (so'm)</label>
            <input
              value={amountStr}
              onChange={(e) => onAmountChange(e.target.value)}
              inputMode="numeric"
              placeholder="100 000"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {amount > available && (
              <p className="mt-1.5 text-[12.5px] font-medium text-red-500">
                Balansingizda buncha {method === "CASH" ? "naqd" : "klik"} pul yo'q (bor: {formatCurrency(available)})
              </p>
            )}
          </div>

          {/* Izoh */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Izoh (ixtiyoriy)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masalan: kunlik topshirish"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || createTransfer.isPending}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {createTransfer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            Yuborish
          </button>
          <p className="text-[12px] text-gray-400 text-center leading-snug">
            Pul balansingizdan darrov ayiriladi. Qabul qiluvchi "Qabul qilish"ni
            bosgandagina unga o'tadi; rad etsa — sizga qaytadi.
          </p>
        </form>
      </div>
    </div>
  );
}
