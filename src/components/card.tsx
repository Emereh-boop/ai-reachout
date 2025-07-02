import React from "react";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-transparent rounded-2xl shadow-xl outline-2 outline-gray-700 p-4 ${className}`}>
      {children}
    </div>
  );
} 