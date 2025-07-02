import React from "react";
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">{children}</span>;
} 