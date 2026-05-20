import { LucideIcon } from "lucide-react";
import StatCard from "./StatCard";
import { cn } from "@/lib/utils";

type Accent = "primary" | "success" | "warning" | "purple" | "info" | "muted";

interface ClickableStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: Accent;
  onClick: () => void;
  disabled?: boolean;
}

export default function ClickableStatCard({
  label,
  value,
  icon,
  accent = "primary",
  onClick,
  disabled = false,
}: ClickableStatCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left transition-all duration-200",
        "hover:shadow-md active:scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer"
      )}
    >
      <StatCard
        label={label}
        value={value}
        icon={icon}
        accent={accent}
      />
    </button>
  );
}
