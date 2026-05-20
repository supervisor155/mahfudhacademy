import React from 'react';
import { FaComment, FaPlay, FaThumbsUp } from 'react-icons/fa';

export default function ReelCard({ reel, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[26px] border border-[#e3e7e3] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.05)] transition-all hover:-translate-y-1 hover:border-[#c7d6d2] hover:shadow-[0_18px_40px_rgba(17,24,39,0.08)]"
    >
      {/* Thumbnail */}
      <div className="relative flex h-56 items-center justify-center overflow-hidden border-b border-[#edf0ed] bg-[#e9eeea]">
        {reel.thumbnail ? (
          <img src={reel.thumbnail} alt={reel.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#dfe7e5] via-[#d7e0dd] to-[#cfdad6]"></div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/15">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2d5a56]/90 text-white shadow-lg transition-all group-hover:scale-110">
            <FaPlay className="ml-1 text-xl" />
          </div>
        </div>
        <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
          {reel.duration || '0:45'}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-5">
        <div>
          <h3 className="mb-1 line-clamp-2 font-bold text-slate-900">{reel.title}</h3>
          <p className="line-clamp-2 text-sm text-slate-500">{reel.description || 'Short reflection and practical learning in a quick format.'}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between border-t border-[#edf0ed] pt-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-[#2d5a56]">
              <FaThumbsUp className="text-[#2d5a56]" />
              <span>{reel.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-[#2d5a56]">
              <FaComment className="text-[#2d5a56]" />
              <span>{reel.comments || 0}</span>
            </div>
          </div>
          <span className="font-medium text-slate-400">Featured Reel</span>
        </div>
      </div>
    </div>
  );
}
