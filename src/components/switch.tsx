import React from "react";

export function Switch({ checked, onChange, className = "" }: { checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }) {
  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-indigo-600 w-5 h-5" />
      <span className="ml-2"></span>
    </label>
  );
} 