"use client";

import { useState } from "react";
import {
  UserPlus, MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  useUsers, useUserStats, useCreateUser, useUpdateUser, useDeleteUser, User,
} from "@/hooks/use-users";
import { UserForm } from "./user-form";
import { formatPhone, formatDate } from "@/lib/utils";
import { ROLE_LABELS, Role } from "@aqua/shared";
import { cn } from "@/lib/utils";
import {
  Avatar, Pill, btnPrimary, thClass, cardClass, rowBtnClass,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";

// Rol → pill toni va tavsif (dizayn roleMeta)
const ROLE_META: Record<string, { tone: Tone; desc: string; dot: string }> = {
  ADMIN:    { tone: "danger", desc: "To'liq kirish", dot: "bg-red-500" },
  MANAGER:  { tone: "primary", desc: "Buyurtma & mijoz & moliya", dot: "bg-blue-600" },
  OPERATOR: { tone: "muted", desc: "Buyurtma kiritish", dot: "bg-gray-400" },
  DRIVER:   { tone: "success", desc: "Yetkazib berish", dot: "bg-green-500" },
};

export function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data: users = [], isLoading } = useUsers();
  const { data: stats } = useUserStats();
  const create = useCreateUser();
  const update = useUpdateUser();
  const del = useDeleteUser();

  const handleSubmit = async (data: any) => {
    if (editUser) {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      await update.mutateAsync({ id: editUser.id, data: payload });
    } else {
      await create.mutateAsync(data);
    }
    setShowForm(false);
    setEditUser(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    await del.mutateAsync(id);
    setOpenMenu(null);
  };

  const handleToggle = async (u: User) => {
    await update.mutateAsync({ id: u.id, data: { isActive: !u.isActive } });
    setOpenMenu(null);
  };

  return (
    <div>
      {/* Bo'lim sarlavhasi (Sozlamalar ichida tab bo'lib ochiladi) */}
      <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">
            Foydalanuvchilar
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {users.length} foydalanuvchi · 4 rol (RBAC)
          </p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true); }} className={btnPrimary}>
          <UserPlus className="w-4 h-4 flex-none" />
          Foydalanuvchi
        </button>
      </div>

      {/* Rol kartalari */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
        {(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"] as const).map((role) => {
          const meta = ROLE_META[role];
          return (
            <div
              key={role}
              className="bg-white dark:bg-gray-900 rounded-[14px] border border-gray-100 dark:border-gray-800 px-4 py-[15px] shadow-card flex items-center gap-3"
            >
              <span className={cn("w-2.5 h-2.5 rounded-full flex-none", meta.dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                  {ROLE_LABELS[role as Role]}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-px truncate">{meta.desc}</p>
              </div>
              <span className="text-[21px] font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                {stats?.[role] ?? 0}
              </span>
            </div>
          );
        })}
      </div>

      {/* Jadval */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Foydalanuvchi</th>
                <th className={thClass}>Rol</th>
                <th className={thClass}>Telefon</th>
                <th className={thClass}>Holat</th>
                <th className={thClass}>Qo'shilgan</th>
                <th className={cn(thClass, "pr-5")}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((u) => {
                const meta = ROLE_META[u.role] || ROLE_META.OPERATOR;
                return (
                  <tr
                    key={u.id}
                    className={cn(
                      "border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors",
                      !u.isActive && "opacity-50"
                    )}
                  >
                    <td className="px-4 pl-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={38} />
                        <span className="text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={meta.tone}>{ROLE_LABELS[u.role as Role]}</Pill>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatPhone(u.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-none",
                          u.isActive ? "bg-green-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"
                        )} />
                        <span className="text-[13px] text-gray-500 dark:text-gray-400">
                          {u.isActive ? "Faol" : "Nofaol"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 pr-5 py-3 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          onClick={() => { setEditUser(u); setShowForm(true); setOpenMenu(null); }}
                          title="Tahrirlash"
                          className={rowBtnClass}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                            title="Boshqa"
                            className={rowBtnClass}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === u.id && (
                            <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-card-hover overflow-hidden">
                              <button
                                onClick={() => handleToggle(u)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                {u.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                                {u.isActive ? "Nofaol qilish" : "Faol qilish"}
                              </button>
                              <button
                                onClick={() => handleDelete(u.id, u.name)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                O'chirish
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserForm
          user={editUser || undefined}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          isLoading={create.isPending || update.isPending}
        />
      )}
    </div>
  );
}
