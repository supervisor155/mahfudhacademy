import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-gradient-to-b from-[#f8faf8] to-[#f1f5f1] p-12 text-center">
      {Icon && (
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_4px_16px_rgba(17,24,39,0.08)]">
          <Icon className="text-3xl text-[#8ba8a3]" />
        </div>
      )}
      <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mb-7 max-w-md text-sm text-slate-500">{description}</p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

