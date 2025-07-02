import React from "react";
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-2xl shadow-md ${className}`}>{children}</div>;
} 