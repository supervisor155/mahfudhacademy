import React, { useState } from 'react';
import { FaArrowRight, FaCheck, FaClock, FaCopy, FaEye, FaEyeSlash, FaUsers } from 'react-icons/fa';

const COVERS = {
  teal:    { bg: 'from-[#1f4a47] to-[#2d5a56]',   text: '#b6f2d6' },
  blue:    { bg: 'from-[#1e3a6e] to-[#2563eb]',   text: '#bfdbfe' },
  purple:  { bg: 'from-[#3b1a6e] to-[#7c3aed]',   text: '#e9d5ff' },
  amber:   { bg: 'from-[#78350f] to-[#d97706]',   text: '#fde68a' },
  rose:    { bg: 'from-[#881337] to-[#e11d48]',   text: '#fecdd3' },
  indigo:  { bg: 'from-[#1e1b4b] to-[#4338ca]',   text: '#c7d2fe' },
  emerald: { bg: 'from-[#064e3b] to-[#10b981]',   text: '#a7f3d0' },
  slate:   { bg: 'from-[#0f172a] to-[#475569]',   text: '#cbd5e1' },
};

export { COVERS };

export default function ClassCard({ classData, onClick }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const cover = COVERS[classData.cover_color] || COVERS.teal;
  const initial = (classData.name || '?').charAt(0).toUpperCase();
  const progress = Math.max(0, Math.min(100, Number(classData.progress) || 0));
  const nextLesson = classData.nextLesson || classData.schedule || 'Schedule TBD';
  const inviteCode = classData.invite_code || null;
  const activeStudents = Number(classData.activeStudents) || 0;
  const maskedCode = inviteCode
    ? `${''.repeat(Math.max(0, inviteCode.length - 4))}${inviteCode.slice(-4)}`
    : null;

  function handleCopy(e) {
    e.stopPropagation();
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReveal(e) {
    e.stopPropagation();
    setRevealed((r) => !r);
  }

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[28px] border border-[#e3e7e3] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(17,24,39,0.10)]"
    >
      {/* Cover Banner */}
      <div className={`relative h-28 bg-gradient-to-br ${cover.bg} overflow-hidden`}>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/8" />
        <div className="pointer-events-none absolute -bottom-4 left-8 h-16 w-16 rounded-full bg-white/6" />
        <div className="relative flex h-full items-center px-6 gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl font-extrabold text-white shadow-lg">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white">
              {classData.name}
            </h3>
            {classData.level && (
              <span className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
                {classData.level}
              </span>
            )}
          </div>
        </div>
        {activeStudents > 0 && (
          <div className="absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-full bg-green-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {activeStudents} active
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="space-y-4 p-5">
        <p className="line-clamp-2 text-sm leading-6 text-slate-500">
          {classData.description || 'A guided learning track to deepen understanding and consistency in study.'}
        </p>

        <div className="space-y-2 rounded-2xl bg-[#f5f7f5] p-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#dde4e0]">
            <div
              className="h-full rounded-full bg-[#2f5e58] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#eef1ee] pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FaUsers className="text-[#2d5a56]" />
            <span>{classData.memberCount || 0} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaClock className="text-[#2d5a56]" />
            <span>{nextLesson}</span>
          </div>
        </div>

        {inviteCode && (
          <div
            className="flex items-center gap-2 rounded-2xl border border-[#e3ede9] bg-[#f5f9f7] px-3 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex-1 select-all font-mono text-xs tracking-widest text-slate-600">
              {revealed ? inviteCode : maskedCode}
            </span>
            <button onClick={handleReveal} className="rounded-lg p-1 text-slate-400 transition hover:text-[#2d5a56]" title={revealed ? 'Hide' : 'Show'}>
              {revealed ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
            </button>
            <button onClick={handleCopy} className={`rounded-lg p-1 transition ${copied ? 'text-green-500' : 'text-slate-400 hover:text-[#2d5a56]'}`} title="Copy">
              {copied ? <FaCheck className="text-xs" /> : <FaCopy className="text-xs" />}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#2d5a56]">Enter Class</span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${cover.bg} text-white shadow transition-transform group-hover:translate-x-1`}>
            <FaArrowRight className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
