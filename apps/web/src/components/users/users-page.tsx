"use client";

import { useState } from "react";
import {
  Plus, Phone, Shield, ShieldCheck, UserCog, Truck,
  MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  useUsers, useUserStats, useCreateUser, useUpdateUser, useDeleteUser, User,
} from "@/hooks/use-users";
import { UserForm } from "./user-form";
import { formatPhone, formatDate, getInitials } from "@/lib/utils";
import { ROLE_LABELS, Role } from "@aqua/shared";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { icon: any; color: string }> = {
  ADMIN:    { icon: ShieldCheck, color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  MANAGER:  { icon: Shield, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  OPERATOR: { icon: UserCog, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  DRIVER:   { icon: Truck, color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Foydalanuvchilar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Rol asosida boshqaruv (RBAC)</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yangi foydalanuvchi
        </button>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-4 gap-4">
        {(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"] as const).map((role) => {
          const meta = ROLE_META[role];
          return (
            <div key={role} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", meta.color)}>
                <meta.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.[role] ?? 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[role as Role]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Foydalanuvchi", "Telefon", "Rol", "Holat", "Qo'shilgan", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.map((u) => {
              const meta = ROLE_META[u.role];
              return (
                <tr key={u.id} className={cn("border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group", !u.isActive && "opacity-50")}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-xs">
                        {getInitials(u.name)}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono">{formatPhone(u.phone)}</td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", meta.color)}>
                      <meta.icon className="w-3 h-3" />
                      {ROLE_LABELS[u.role as Role]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", u.isActive ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
                      {u.isActive ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === u.id && (
                        <div className="absolute right-0 top-9 z-20 w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                          <button onClick={() => { setEditUser(u); setShowForm(true); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Edit className="w-3.5 h-3.5" /> Tahrirlash
                          </button>
                          <button onClick={() => handleToggle(u)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            {u.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                            {u.isActive ? "Nofaol qilish" : "Faol qilish"}
                          </button>
                          <button onClick={() => handleDelete(u.id, u.name)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
