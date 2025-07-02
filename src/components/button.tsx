import React from "react";
export function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`px-4 py-2 rounded-xl font-semibold focus:outline-none bg-indigo-600 text-white hover:bg-indigo-700 ${className}`} {...props}>{children}</button>;
} 