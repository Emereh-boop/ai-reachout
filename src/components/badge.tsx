import React from "react";

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
      {children}
    </span>
  );
} 