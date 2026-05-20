import React from 'react';
import { FaBook, FaComments, FaFilm, FaHome, FaVideo } from 'react-icons/fa';

export default function DashboardSidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome, arabic: 'الرئيسية' },
    { id: 'classes', label: 'Classes', icon: FaBook, arabic: 'الفصول' },
    { id: 'chat', label: 'Chat', icon: FaComments, arabic: 'الدردشة' },
    { id: 'reels', label: 'Reels', icon: FaFilm, arabic: 'المقاطع' },
    { id: 'sessions', label: 'Live Sessions', icon: FaVideo, arabic: 'الجلسات المباشرة' },
  ];

  return (
    <div className="w-full">
      <nav className="space-y-2.5">
        {tabs.map(({ id, label, icon: Icon, arabic }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
              activeTab === id
                ? 'border-white/10 bg-white/10 text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)]'
                : 'border-transparent text-slate-300 hover:border-white/6 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  activeTab === id
                    ? 'bg-[#2b5752] text-[#cce7dd]'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                <Icon className="text-base" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs opacity-70" style={{ fontFamily: 'Noto Naskh Arabic, serif' }}>
                  {arabic}
                </div>
              </div>
              {activeTab === id && <div className="h-2.5 w-2.5 rounded-full bg-[#9fd0c4]"></div>}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
