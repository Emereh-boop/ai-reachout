import React from "react";
export function Switch({ checked, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" checked={checked} {...props} />;
} 