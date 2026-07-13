import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, OrderStatus } from "@aqua/shared";

// Dizayn (AquaERP.dc.html) rang xaritasi: weak fon + rangli matn + nuqta
// ASSIGNED — sky (asl ko'k): brend qizilga o'tgach (blue→red remap)
// "biriktirilgan" bekor qilingan (qizil) bilan adashmasligi kerak.
const STYLE: Record<string, string> = {
  NEW:        "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  PROCESSING: "bg-amber-50  text-amber-600  dark:bg-amber-500/15  dark:text-amber-300",
  ASSIGNED:   "bg-sky-50    text-sky-600    dark:bg-sky-500/15    dark:text-sky-300",
  DELIVERED:  "bg-green-50  text-green-600  dark:bg-green-500/15  dark:text-green-400",
  CANCELLED:  "bg-red-50    text-red-500    dark:bg-red-500/15    dark:text-red-400",
};

const DOT: Record<string, string> = {
  NEW:        "bg-violet-500",
  PROCESSING: "bg-amber-500 animate-pulse",
  ASSIGNED:   "bg-sky-500",
  DELIVERED:  "bg-green-500",
  CANCELLED:  "bg-red-500",
};

interface Props {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: Props) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap",
      size === "sm" ? "text-[11.5px] px-2.5 py-[3px]" : "text-sm px-3 py-1",
      STYLE[status] || "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT[status] || "bg-gray-400")} />
      {ORDER_STATUS_LABELS[status as OrderStatus] || status}
    </span>
  );
}
