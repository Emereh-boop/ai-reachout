import React from "react";

export function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button className={`px-4 py-2 rounded-xl font-n ormal focus:outline-none bg-indigo-600 text-white hover:bg-indigo-700 ${className}`} {...props}>
      {children}
    </button>
  );
} 