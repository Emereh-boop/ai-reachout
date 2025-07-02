// Central UI exports for shadcn/ui components
// TODO: Replace with real shadcn/ui imports if/when installed

export { Card } from "./card";
export { Switch } from "./switch";
export { Badge } from "./badge";
// export { Avatar } from "./avatar";
export { Button } from "./button";

// Reusable Modal component
import React from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'confirmation';
  confirmText?: string;
  onConfirm?: () => void;
  showFooter?: boolean;
};

export function Modal({ open, onClose, title, children, variant = 'default', confirmText = 'Confirm', onConfirm, showFooter = true }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-50/20">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative animate-fade-in">
        {title && <h2 className="text-xl font-bold mb-4 text-indigo-700">{title}</h2>}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 text-2xl font-bold">&times;</button>
        <div className="mb-4">{children}</div>
        {showFooter && (
          <div className="flex justify-end gap-2 mt-4">
            {variant === 'confirmation' && (
              <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">{confirmText}</button>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// const function Card({ className = "", children }) {
//   return <div className={`bg-white rounded-3xl shadow-xl ${className}`}>{children}</div>;
// }

// export function Switch({ checked }) {
//   return <input type="checkbox" checked={checked} readOnly className="toggle toggle-primary" />;
// }

// export function Badge({ variant = "default", children }) {
//   const color = variant === "success" ? "bg-green-100 text-green-800" : variant === "outline" ? "border border-gray-300 text-gray-600" : "bg-gray-100 text-gray-800";
//   return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{children}</span>;
// }

// export function Avatar({ src, alt, className = "" }) {
//   return <img src={src} alt={alt} className={`rounded-full ${className}`} />;
// }

// export function Button({ variant = "default", size = "md", children }) {
//   const base = "px-4 py-2 rounded-full font-semibold focus:outline-none";
//   const color = variant === "outline" ? "border border-gray-300 bg-white text-gray-700" : "bg-blue-600 text-white";
//   const sz = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm";
//   return <button className={`${base} ${color} ${sz}`}>{children}</button>;
// } 