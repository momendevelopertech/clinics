"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print-hide inline-flex h-11 items-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}