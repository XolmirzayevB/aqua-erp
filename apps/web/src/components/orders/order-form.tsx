"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Search, User } from "lucide-react";
import { useCreateOrder } from "@/hooks/use-orders";
import { useDrivers } from "@/hooks/use-drivers";
import { useCustomers } from "@/hooks/use-customers";
import { formatCurrency, formatPhone } from "@/lib/utils";

const schema = z.object({
  customerId: z.string().uuid("Mijoz tanlang"),
  quantity: z.coerce.number().int().min(1, "Kamida 1 ta"),
  pricePerUnit: z.coerce.number().min(0, "Nol yoki undan ko'p"),
  paymentType: z.enum(["CASH", "CARD", "DEBT"]),
  bottlesReturned: z.coerce.number().int().min(0).default(0),
  driverId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { onClose: () => void; defaultCustomerId?: string }

export function OrderForm({ onClose, defaultCustomerId }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  const createOrder = useCreateOrder();
  const { data: driversData } = useDrivers();
  const { data: customersData } = useCustomers({
    search: customerSearch,
    limit: 8,
  });

  const drivers = driversData || [];
  const customers = customersData?.data || [];

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: defaultCustomerId || "",
      quantity: 1,
      pricePerUnit: 15000,
      paymentType: "CASH",
      bottlesReturned: 0,
    },
  });

  const qty = watch("quantity") || 0;
  const price = watch("pricePerUnit") || 0;
  const total = qty * price;

  const onSubmit = async (data: FormData) => {
    await createOrder.mutateAsync({
      ...data,
      driverId: data.driverId || undefined,
    });
    onClose();
  };

  const selectCustomer = (c: { id: string; name: string }) => {
    setValue("customerId", c.id);
    setSelectedCustomerName(c.name);
    setShowCustomerDrop(false);
    setCustomerSearch("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Yangi buyurtma</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Customer selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Mijoz *
            </label>
            <div className="relative">
              <div
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 cursor-pointer"
                onClick={() => setShowCustomerDrop(true)}
              >
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {selectedCustomerName ? (
                  <span className="text-sm text-gray-900 dark:text-white">{selectedCustomerName}</span>
                ) : (
                  <span className="text-sm text-gray-400">Mijoz tanlang...</span>
                )}
              </div>

              {showCustomerDrop && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        autoFocus
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Qidirish..."
                        className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {customers.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-4">Topilmadi</p>
                    ) : customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0 mt-0.5">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-gray-400">{formatPhone(c.phone)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setShowCustomerDrop(false)}
                      className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Yopish
                    </button>
                  </div>
                </div>
              )}
            </div>
            {errors.customerId && <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>}
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Suv soni (ta) *
              </label>
              <input
                type="number"
                min={1}
                {...register("quantity")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Narx (so'm) *
              </label>
              <input
                type="number"
                min={0}
                {...register("pricePerUnit")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {errors.pricePerUnit && <p className="mt-1 text-xs text-red-500">{errors.pricePerUnit.message}</p>}
            </div>
          </div>

          {/* Total */}
          <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">Jami summa</span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(total)}</span>
          </div>

          {/* Payment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              To'lov turi *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "CASH", label: "💵 Naqd" },
                { value: "CARD", label: "💳 Karta" },
                { value: "DEBT", label: "📋 Nasiya" },
              ].map(({ value, label }) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" value={value} {...register("paymentType")} className="sr-only" />
                  <Controller
                    name="paymentType"
                    control={control}
                    render={({ field }) => (
                      <div
                        onClick={() => field.onChange(value)}
                        className={`flex items-center justify-center py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          field.value === value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {label}
                      </div>
                    )}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Bottles returned + Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Qaytarilgan tara
              </label>
              <input
                type="number"
                min={0}
                {...register("bottlesReturned")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Haydovchi
              </label>
              <select
                {...register("driverId")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Tanlash (ixtiyoriy)</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Qo'shimcha ma'lumot..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Buyurtma yaratish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
