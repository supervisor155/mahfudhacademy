import React from 'react';
import { FaArrowRight, FaClock, FaUser, FaVideo } from 'react-icons/fa';

export default function SessionCard({ session, onClick }) {
  const getStatusColor = (status) => {
    if (status === 'live') return 'border border-red-200 bg-red-50 text-red-600';
    if (status === 'upcoming') return 'border border-[#cce1da] bg-[#edf6f3] text-[#2d5a56]';
    return 'border border-slate-200 bg-slate-100 text-slate-500';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Time TBD';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date TBD';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const instructor = session.instructorName || session.teacherName || 'Instructor';
  const actionLabel = session.status === 'live' ? 'Join Now' : 'Open Session';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[24px] border border-[#e3e7e3] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.05)] transition-all hover:-translate-y-1 hover:border-[#c7d6d2] hover:shadow-[0_18px_40px_rgba(17,24,39,0.08)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf3f8] text-[#46698e]">
            <FaVideo className="text-xl" />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{session.title}</h3>
              <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                {session.description || 'A guided session with your instructor.'}
              </p>
            </div>
            <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(session.status)}`}>
              {session.status === 'live' ? 'LIVE NOW' : session.status?.toUpperCase() || 'SCHEDULED'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <FaClock className="text-[#2d5a56]" />
              <span>{formatDate(session.start_time)} at {formatTime(session.start_time)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaUser className="text-[#2d5a56]" />
              <span>{instructor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#eef1ee] pt-4">
            <span className="text-sm font-semibold text-[#2d5a56]">{actionLabel}</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2d5a56] text-white">
              <FaArrowRight className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
