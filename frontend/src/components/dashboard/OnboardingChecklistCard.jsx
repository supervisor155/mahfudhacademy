import React from 'react';
import { FaCheckCircle, FaCircle, FaExternalLinkAlt } from 'react-icons/fa';

export default function OnboardingChecklistCard({ title, subtitle, items = [], darkMode = false, className = '' }) {
  const completed = items.filter((item) => item.done).length;
  const total = items.length || 1;
  const percent = Math.round((completed / total) * 100);

  return (
    <section className={`rounded-3xl border p-5 shadow-[0_8px_20px_rgba(17,24,39,0.04)] ${darkMode ? 'border-[#2b3642] bg-[#1a222c]' : 'border-[#dfe7e3] bg-white'} ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Onboarding</p>
          <h3 className={`mt-1 text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
          {subtitle ? <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p> : null}
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-[#22352f] text-[#a5d4c5]' : 'bg-[#edf6f3] text-[#2d5a56]'}`}>{completed}/{items.length}</div>
      </div>

      <div className={`mb-4 h-2 overflow-hidden rounded-full ${darkMode ? 'bg-[#2a3640]' : 'bg-[#eaf0ed]'}`}>
        <div className="h-full rounded-full bg-[#2d5a56] transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 ${darkMode ? 'border-[#2b3642]' : 'border-[#edf1ee]'}`}>
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 text-sm text-[#2d5a56]">
                {item.done ? <FaCheckCircle /> : <FaCircle className="text-[10px]" />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : (item.done ? 'text-slate-700' : 'text-slate-900')}`}>{item.label}</p>
                {item.hint ? <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.hint}</p> : null}
              </div>
            </div>
            {item.onClick ? (
              <button onClick={item.onClick} className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${darkMode ? 'bg-[#222e3a] text-[#9fc8bb] hover:bg-[#283646]' : 'bg-[#f4f7f5] text-[#2d5a56] hover:bg-[#e8f2ee]'}`}>
                Open <FaExternalLinkAlt className="ml-1 inline text-[10px]" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
