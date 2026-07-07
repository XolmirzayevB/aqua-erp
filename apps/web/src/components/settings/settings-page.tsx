"use client";

import { useState } from "react";
import {
  Database, Download, RotateCcw, Trash2, Plus, Loader2,
  HardDrive, Users as UsersIcon, Moon, Sun, Monitor, DollarSign, MapPin, X,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useBackups, useCreateBackup, useRestoreBackup, useDeleteBackup,
} from "@/hooks/use-users";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { UsersPage } from "@/components/users/users-page";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "business", label: "Narx va Hududlar", icon: DollarSign },
  { key: "users", label: "Foydalanuvchilar", icon: UsersIcon },
  { key: "backup", label: "Backup", icon: Database },
  { key: "appearance", label: "Ko'rinish", icon: Monitor },
];

export function SettingsPage() {
  const [tab, setTab] = useState("business");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-1">
            Sozlamalar
          </h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Tizim boshqaruvi</p>
        </div>
      </div>

      {/* Tabs — dizayn segment uslubida */}
      <div className="inline-flex gap-1 p-1 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl overflow-x-auto max-w-full">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold whitespace-nowrap transition-all",
              tab === key
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-card"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "business" && <BusinessSection />}
      {tab === "users" && <UsersPage />}
      {tab === "backup" && <BackupSection />}
      {tab === "appearance" && <AppearanceSection />}
    </div>
  );
}

function BusinessSection() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [newBottlePrice, setNewBottlePrice] = useState<string>("");
  const [refillPrice, setRefillPrice] = useState<string>("");
  const [zones, setZones] = useState<string[]>([]);
  const [newZone, setNewZone] = useState("");
  const [loaded, setLoaded] = useState(false);

  // settings kelganda formani to'ldiramiz
  if (settings && !loaded) {
    setNewBottlePrice(String(settings.newBottlePrice));
    setRefillPrice(String(settings.refillPrice));
    setZones(settings.zones);
    setLoaded(true);
  }

  const save = async () => {
    await update.mutateAsync({
      newBottlePrice: Number(newBottlePrice),
      refillPrice: Number(refillPrice),
      zones,
    });
  };

  const addZone = () => {
    const z = newZone.trim().toUpperCase();
    if (z && !zones.includes(z)) setZones([...zones, z]);
    setNewZone("");
  };

  if (isLoading) return <div className="text-gray-400 text-sm py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Narxlar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600" /> Narxlar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Buyurtmalarda shu narxlar ishlatiladi</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🆕 Yangi tara narxi</label>
            <input type="number" value={newBottlePrice} onChange={(e) => setNewBottlePrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(Number(newBottlePrice) || 0)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">🔄 To'ldirish (almashtirish)</label>
            <input type="number" value={refillPrice} onChange={(e) => setRefillPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(Number(refillPrice) || 0)}</p>
          </div>
        </div>
      </div>

      {/* Hududlar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" /> Hududlar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Mijoz qo'shganda shu hududlardan tanlanadi</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {zones.map((z) => (
            <span key={z} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-sm font-medium">
              Hudud {z}
              <button onClick={() => setZones(zones.filter((x) => x !== z))} className="hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addZone())}
            placeholder="Yangi hudud nomi (masalan: Markaz)" maxLength={50}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addZone} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">Qo'shish</button>
        </div>
      </div>

      <button onClick={save} disabled={update.isPending}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors flex items-center justify-center gap-2">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Saqlash
      </button>
    </div>
  );
}

function BackupSection() {
  const { data: backups = [], isLoading } = useBackups();
  const create = useCreateBackup();
  const restore = useRestoreBackup();
  const del = useDeleteBackup();

  const handleRestore = async (filename: string) => {
    if (!confirm("DIQQAT! Bu joriy ma'lumotlarni backup bilan almashtiradi. Davom etasizmi?")) return;
    await restore.mutateAsync(filename);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm("Backupni o'chirishni tasdiqlaysizmi?")) return;
    await del.mutateAsync(filename);
  };

  const handleDownload = async (filename: string) => {
    const token = useAuthStore.getState().accessToken;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/v1/backup/download/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-3 flex items-start gap-2">
        <Database className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Avtomatik backup</strong> har kuni soat 02:00 da yaratiladi va 14 kun saqlanadi.
          Qo'lda ham backup yaratishingiz mumkin.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Backup yaratish
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Fayl", "Hajmi", "Yaratilgan", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : backups.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Hali backup yo'q
              </td></tr>
            ) : backups.map((b: any) => (
              <tr key={b.filename} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{b.filename}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{b.sizeFormatted}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(b.createdAt, "dd.MM.yyyy HH:mm")}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(b.filename)} title="Yuklab olish" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRestore(b.filename)} title="Tiklash" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(b.filename)} title="O'chirish" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Yorug'", icon: Sun },
    { value: "dark", label: "Qorong'i", icon: Moon },
    { value: "system", label: "Tizim", icon: Monitor },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 max-w-md">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Mavzu (Theme)</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Interfeys rangini tanlang</p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
              theme === value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
