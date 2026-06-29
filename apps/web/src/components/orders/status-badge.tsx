import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, OrderStatus } from "@aqua/shared";

const STYLE: Record<string, string> = {
  NEW:        "bg-blue-50   text-blue-700   dark:bg-blue-950/50   dark:text-blue-400   border-blue-100   dark:border-blue-900/50",
  PROCESSING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/50",
  ASSIGNED:   "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900/50",
  DELIVERED:  "bg-green-50  text-green-700  dark:bg-green-950/50  dark:text-green-400  border-green-100  dark:border-green-900/50",
  CANCELLED:  "bg-red-50    text-red-600    dark:bg-red-950/50    dark:text-red-400    border-red-100    dark:border-red-900/50",
};

const DOT: Record<string, string> = {
  NEW:        "bg-blue-500",
  PROCESSING: "bg-yellow-500",
  ASSIGNED:   "bg-purple-500",
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
      "inline-flex items-center gap-1.5 font-medium rounded-full border",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      STYLE[status] || "bg-gray-50 text-gray-600 border-gray-100"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT[status] || "bg-gray-400")} />
      {ORDER_STATUS_LABELS[status as OrderStatus] || status}
    </span>
  );
}
