import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  /** Tanpa padding bawaan — untuk kartu yang mengatur padding sendiri. */
  bare?: boolean;
};

/**
 * Permukaan kartu standar. Radius & padding sengaja lebih kecil di mobile
 * (20px/16px) lalu melebar di layar besar, supaya proporsi konsisten di
 * seluruh area customer.
 */
export default function SurfaceCard({
  children,
  className,
  bare = false,
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,42,73,0.04)]",
        !bare && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
