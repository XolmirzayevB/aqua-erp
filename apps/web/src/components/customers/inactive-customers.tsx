"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Clock, MessageSquare, CheckCheck, X,
} from "lucide-react";
import {
  useInactiveCustomers, useMarkSms, useUnmarkSms,
  type CustomerSmsInfo, type SmsFilter,
} from "@/hooks/use-customers";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, SegmentTabs, thClass, cardClass, LoadMore, rowBtnClass,
} from "@/components/shared/page-ui";
import { useAuthStore } from "@/store/auth.store";

const DAY_OPTIONS = [
  { value: "7", label: "7 kun" },
  { value: "14", label: "14 kun" },
  { value: "30", label: "30 kun" },
];

// Nechchi kun bo'lganiga qarab rang (uzoq = qizilroq)
function toneForDays(d: number) {
  if (d >= 30) return "danger" as const;
  if (d >= 14) return "warning" as const;
  return "muted" as const;
}

// SMS tugmasi (2026-10-05, egasi so'rovi): bosilganda telefonning SMS ilovasi
// raqam va shu matn bilan ochiladi — "Yuborish"ni odam o'zi bosadi (server
// SMS yubormaydi). Matnda oddiy ' ishlating (ʻ emas) — aks holda SMS qimmatlashadi.
const smsText = (name: string) =>
  `Assalomu alaykum, ${name}! Gissar Water. Anchadan beri suv buyurtma qilmadingiz. Suv kerak bo'lsa, shu raqamga yozing yoki qo'ng'iroq qiling.`;

// "?&body=" — iPhone ham, Android ham tushunadigan ko'rinish
const smsHref = (phone: string, name: string) =>
  `sms:${phone}?&body=${encodeURIComponent(smsText(name.trim()))}`;

// Telefonsiz mijozlar vaqtinchalik +99800000000N raqam bilan kiritilgan
const hasRealPhone = (phone: string) => !phone.startsWith("+99800000000");

// "05.10.2026 · 15:42 · Aziz" — qachon va kim yuborgani
const smsWhen = (sms: CustomerSmsInfo) =>
  `${formatDate(sms.lastAt, "dd.MM.yyyy")} · ${formatDate(sms.lastAt, "HH:mm")}`;

const smsBtnClass =
  "inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold transition-colors whitespace-nowrap";

const EMPTY_TEXT: Record<SmsFilter, string> = {
  all: "Yaxshi — bu davrda yo'qolayotgan mijoz yo'q",
  unsent: "Hammasiga SMS jo'natilgan",
  sent: "Hali hech kimga SMS jo'natilmagan",
};

export function InactiveCustomers() {
  const [days, setDays] = useState("14");
  const [smsFilter, setSmsFilter] = useState<SmsFilter>("all");
  const [limit, setLimit] = useState(30);   // sahifalash o'rniga ko'proq ko'rsatish
  const me = useAuthStore((s) => s.user?.name) ?? "";
  const { data, isLoading } = useInactiveCustomers(Number(days), limit, smsFilter);
  const markSms = useMarkSms();
  const unmarkSms = useUnmarkSms();

  const list = data?.data || [];
  const meta = data?.meta;

  // SMS tugmasi bosilganda — yuborildi deb belgilanadi (adashsa "Bekor qilish")
  const onSms = (id: string) => markSms.mutate({ id, by: me });
  const onUndo = (id: string, name: string) => {
    if (!confirm(`"${name}" — SMS jo'natildi belgisini olib tashlaysizmi?`)) return;
    unmarkSms.mutate(id);
  };

  const smsOptions: { value: SmsFilter; label: string; count?: number }[] = [
    { value: "all", label: "Hammasi", count: meta?.all },
    { value: "unsent", label: "SMS yo'q", count: meta ? meta.all - meta.smsSent : undefined },
    { value: "sent", label: "SMS bor", count: meta?.smsSent },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/customers"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Yo'qolayotgan mijozlar"
            subtitle={meta
              ? `${meta.all} ta mijoz ${days} kundan beri zakaz qilmagan`
                + (meta.smsSent > 0 ? ` · ${meta.smsSent} tasiga SMS jo'natilgan` : "")
              : "Yuklanmoqda..."}
          />
        </div>
      </div>

      {/* Davr + SMS holati bo'yicha saralash */}
      <div className="mb-4 flex flex-wrap gap-2">
        <SegmentTabs
          stretch
          options={DAY_OPTIONS}
          value={days}
          onChange={(v) => { setDays(v); setLimit(30); }}
        />
        <SegmentTabs
          stretch
          options={smsOptions}
          value={smsFilter}
          onChange={(v) => { setSmsFilter(v); setLimit(30); }}
        />
      </div>

      {/* MOBIL: kartalar */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn(cardClass, "p-4")}>
              <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))
        ) : list.length === 0 ? (
          <div className={cn(cardClass, "px-5 py-12 text-center")}>
            <div className="text-green-500 text-xl mb-1">✓</div>
            <p className="text-gray-400 dark:text-gray-500">{EMPTY_TEXT[smsFilter]}</p>
          </div>
        ) : (
          list.map((c) => (
            <div key={c.id} className={cn(cardClass, "p-4 shadow-card")}>
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="text-[14px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">{c.name}</Link>
                    {c.zone && <Pill tone="primary" className="!text-[11px] !py-0.5">{c.zone}</Pill>}
                  </div>
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{formatPhone(c.phone)}</span>
                </div>
                <Pill tone={toneForDays(c.daysSince)} className="!text-[11px] whitespace-nowrap">
                  <Clock className="w-3 h-3" /> {c.daysSince} kun
                </Pill>
              </div>
              <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 truncate">
                Oxirgi zakaz: {formatDate(c.lastOrderAt, "dd.MM.yyyy")}
                {Number(c.balance) < 0 && <span className="text-red-500 font-medium"> · qarz {formatCurrency(Math.abs(Number(c.balance)))}</span>}
              </div>

              {/* SMS jo'natildi belgisi: qachon (sana, soat) va kim */}
              {c.sms && (
                <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 pl-2.5 pr-1.5 py-2">
                  <span className="w-7 h-7 rounded-full bg-green-500 text-white inline-flex items-center justify-center flex-none">
                    <CheckCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[12.5px] font-semibold text-green-700 dark:text-green-400">
                      SMS jo'natildi{c.sms.count > 1 && ` · ${c.sms.count} marta`}
                    </div>
                    <div className="text-[11.5px] text-green-700/70 dark:text-green-400/70 tabular-nums truncate mt-0.5">
                      {smsWhen(c.sms)}{c.sms.lastBy && ` · ${c.sms.lastBy}`}
                    </div>
                  </div>
                  <button
                    onClick={() => onUndo(c.id, c.name)}
                    disabled={unmarkSms.isPending}
                    aria-label="SMS belgisini bekor qilish"
                    className="flex-none w-8 h-8 rounded-lg inline-flex items-center justify-center text-green-700/50 dark:text-green-400/50 hover:bg-green-100 dark:hover:bg-green-500/15 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 mt-2.5">
                {hasRealPhone(c.phone) && (
                  <a href={smsHref(c.phone, c.name)} onClick={() => onSms(c.id)} className={cn(smsBtnClass, "flex-1 h-9 px-4 text-[13px]")}>
                    <MessageSquare className="w-4 h-4" /> {c.sms ? "Yana SMS" : "SMS"}
                  </a>
                )}
                <a href={`tel:${c.phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors">
                  <Phone className="w-4 h-4" /> Qo'ng'iroq
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* KOMPYUTER: jadval. Telefon ism ostida, kun + sana bitta ustunda —
          SMS ustuni qo'shilgach 1280px ekranga sig'ishi uchun (2026-10-05) */}
      <div className={cn(cardClass, "overflow-hidden hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Mijoz</th>
                <th className={cn(thClass, "!px-3")}>Oxirgi zakaz</th>
                <th className={cn(thClass, "!px-3 text-right")}>Qarz</th>
                <th className={cn(thClass, "!px-3")}>SMS</th>
                <th className={cn(thClass, "pr-5")}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-400/70 dark:border-gray-600">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center border-t border-gray-400/70 dark:border-gray-600">
                    <div className="text-green-500 text-xl mb-1">✓</div>
                    <p className="text-gray-400 dark:text-gray-500">{EMPTY_TEXT[smsFilter]}</p>
                  </td>
                </tr>
              ) : list.map((c) => (
                <tr key={c.id} className="group border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="pl-5 pr-3 py-2.5">
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Avatar name={c.name} size={38} />
                      <div className="min-w-0 leading-tight">
                        <div className="text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap max-w-[200px] truncate">{c.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatPhone(c.phone)}</span>
                          {c.zone && <Pill tone="primary" className="!text-[10.5px] !py-0 !px-2">{c.zone}</Pill>}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Pill tone={toneForDays(c.daysSince)} className="!text-[11px]">
                      <Clock className="w-3 h-3" /> {c.daysSince} kun
                    </Pill>
                    <div className="text-[11.5px] text-gray-400 dark:text-gray-500 tabular-nums mt-1 pl-0.5">{formatDate(c.lastOrderAt, "dd.MM.yyyy")}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums whitespace-nowrap">
                    {Number(c.balance) < 0
                      ? <span className="text-red-500">{formatCurrency(Math.abs(Number(c.balance)))}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {c.sms ? (
                      <div className="flex items-center gap-2" title={c.sms.lastBy ? `Jo'natgan: ${c.sms.lastBy}` : undefined}>
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white inline-flex items-center justify-center flex-none">
                          <CheckCheck className="w-3.5 h-3.5" />
                        </span>
                        <div className="leading-tight">
                          <div className="text-[12.5px] font-semibold text-green-700 dark:text-green-400">
                            Jo'natildi{c.sms.count > 1 && ` · ${c.sms.count} marta`}
                          </div>
                          <div className="text-[11.5px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                            {smsWhen(c.sms)}
                            {/* Kim jo'natgani: keng ekranda yozuvda, torroqda — ustiga borganda */}
                            {c.sms.lastBy && <span className="hidden 2xl:inline"> · {c.sms.lastBy}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => onUndo(c.id, c.name)}
                          disabled={unmarkSms.isPending}
                          title="SMS belgisini bekor qilish"
                          className={cn(rowBtnClass, "opacity-0 group-hover:opacity-100 focus:opacity-100 hover:!text-red-500")}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="pl-3 pr-5 py-2.5 text-right whitespace-nowrap">
                    {hasRealPhone(c.phone) && (
                      <a href={smsHref(c.phone, c.name)} onClick={() => onSms(c.id)} className={cn(smsBtnClass, "h-8 px-3 mr-2 text-xs")}>
                        <MessageSquare className="w-3.5 h-3.5" /> SMS
                      </a>
                    )}
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                      <Phone className="w-3.5 h-3.5" /> Qo'ng'iroq
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {meta && (
        <div className={cn(cardClass, "mt-3 overflow-hidden")}>
          <LoadMore
            shown={list.length}
            total={meta.total}
            step={50}
            loading={isLoading}
            noun="mijoz"
            onMore={() => setLimit((l) => l + 50)}
            onAll={() => setLimit(Math.min(meta.total, 500))}
          />
        </div>
      )}
    </div>
  );
}
