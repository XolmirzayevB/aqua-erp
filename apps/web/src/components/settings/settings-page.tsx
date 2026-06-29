"use client";

import { useState } from "react";
import {
  Database, Download, RotateCcw, Trash2, Plus, Loader2,
  HardDrive, Users as UsersIcon, Moon, Sun, Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useBackups, useCreateBackup, useRestoreBackup, useDeleteBackup,
} from "@/hooks/use-users";
import { UsersPage } from "@/components/users/users-page";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "users", label: "Foydalanuvchilar", icon: UsersIcon },
  { key: "backup", label: "Backup", icon: Database },
  { key: "appearance", label: "Ko'rinish", icon: Monitor },
];

export function SettingsPage() {
  const [tab, setTab] = useState("users");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sozlamalar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tizim boshqaruvi</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
              tab === key
                ? "border-blue-600 text-blue-700 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersPage />}
      {tab === "backup" && <BackupSection />}
      {tab === "appearance" && <AppearanceSection />}
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
              <tr key={b.filename} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
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
