import React from 'react';
import Button from './ui/Button';

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-border-light dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-text-primary dark:text-white">{title}</h3>
          <Button onClick={onClose} variant="secondary" className="py-1 px-2 text-xs">Close</Button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
