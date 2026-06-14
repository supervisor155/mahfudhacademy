import { useState, useMemo } from 'react';
import { FaSearch, FaBookmark } from 'react-icons/fa';

export const SurahSidebar = ({
  surahs,
  currentSurah,
  onSurahSelect,
  bookmarks,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;

    const lowerQuery = searchQuery.toLowerCase();
    return surahs.filter((surah) =>
      surah.name.toLowerCase().includes(lowerQuery) ||
      surah.englishName.toLowerCase().includes(lowerQuery) ||
      surah.number.toString() === searchQuery
    );
  }, [surahs, searchQuery]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-[#22383d] bg-[#182c31] text-white shadow-[0_18px_40px_rgba(24,44,49,0.18)]">
      {/* Header */}
      <div className="border-b border-white/10 p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9fbab4]">
          Surah Index
        </div>
        <h2 className="mb-3 text-lg font-bold text-white" style={{ fontFamily: 'Noto Naskh Arabic, serif' }}>
           
        </h2>
        
        {/* Search Box */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#88a6a0]" />
          <input
            type="text"
            placeholder="Search Surahs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/8 py-3 pl-9 pr-3 text-sm text-white placeholder:text-[#88a6a0] focus:outline-none focus:ring-2 focus:ring-[#7ca89d]"
          />
        </div>
      </div>

      {/* Surahs List */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
        {loading ? (
          <div className="p-4 text-center text-[#9fbab4]">
            <p className="text-sm">Loading Surahs...</p>
          </div>
        ) : filteredSurahs.length === 0 ? (
          <div className="p-4 text-center text-[#9fbab4]">
            <p className="text-sm">No Surahs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSurahs.map((surah) => {
              const isBookmarked = bookmarks.some(
                (b) => b.surahNumber === surah.number
              );
              const isActive = currentSurah === surah.number;

              return (
                <button
                  key={surah.number}
                  onClick={() => onSurahSelect(surah.number)}
                  className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-white/10 text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/10'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`min-w-max text-xs font-bold ${isActive ? 'text-[#cce7dd]' : 'text-[#88a6a0]'}`}>
                          {surah.number}
                        </span>
                        <span className="font-medium truncate text-sm">
                          {surah.englishName}
                        </span>
                      </div>
                      <p className={`mt-1 flex items-center gap-1 text-xs ${isActive ? 'text-[#c7ddd7]' : 'text-[#88a6a0]'}`}>
                        {surah.numberOfAyahs} Ayahs  {surah.revealedIn}
                      </p>
                    </div>

                    {/* Bookmark Indicator */}
                    {isBookmarked && (
                      <FaBookmark className="mt-1 flex-shrink-0 text-xs text-[#e7d08a]" />
                    )}
                  </div>

                  {/* Arabic Name */}
                  <p className={`mt-2 text-right text-sm ${isActive ? 'text-white' : 'text-[#d5e5e0]'}`} style={{ fontFamily: 'Noto Naskh Arabic, serif' }}>
                    {surah.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 bg-white/5 p-4 text-center text-xs text-[#9fbab4]">
        <p className="font-semibold">Total: {surahs.length} Surahs</p>
      </div>
    </div>
  );
};
