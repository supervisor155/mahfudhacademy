import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaBookOpen, FaCog, FaTimes, FaHandPaper, FaChalkboardTeacher, FaCheck, FaChevronLeft, FaChevronRight, FaPlay, FaPause, FaVolumeUp, FaBookmark, FaChevronDown } from 'react-icons/fa';
import { SurahSidebar } from '../../components/mushaf/SurahSidebar';
import { AyahDisplay } from '../../components/mushaf/AyahDisplay';
import { NotesPanel } from '../../components/mushaf/NotesPanel';
import { useQuranData } from '../../hooks/useQuranData';
import { useAyahNotes } from '../../hooks/useAyahNotes';
import { useAuth } from '../../contexts/AuthContext';
import { createAppSocket } from '../../services/socket';

const THEME_PREVIEWS = [
  { id: 'dark',  label: 'Dark',  pageBg: '#111827', panelBg: '#0d1118', textColor: '#ffffff', borderColor: '#2d5a56' },
  { id: 'light', label: 'Light', pageBg: '#f8fafc', panelBg: '#ffffff', textColor: '#1f2937', borderColor: '#e2e8f0' },
  { id: 'sepia', label: 'Sepia', pageBg: '#f5ead7', panelBg: '#fdf6e3', textColor: '#3d2b1f', borderColor: '#c4a97d' },
];

const FONT_OPTIONS = [
  { id: 'uthmanic', label: 'Uthmanic Hafs',    fontStyle: '"UthmanicHafs", serif' },
  { id: 'naskh',    label: 'Noto Naskh Arabic', fontStyle: '"Noto Naskh Arabic", serif' },
  { id: 'amiri',    label: 'Amiri',              fontStyle: '"Amiri", serif' },
];

const PAGE_BG = { dark: 'bg-[#111827]', light: 'bg-[#f0f4f8]', sepia: 'bg-[#f5ead7]' };

export const MushafViewer = () => {
  const navigate = useNavigate();
  const { surahId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const isTeacher = user && ['teacher', 'owner', 'manager'].includes(user.role);
  const classId = searchParams.get('classId');
  const socketRef = useRef(null);
  const [raisedBanner, setRaisedBanner] = useState(null); // { surah_id, ayah_number, surah_name, teacher }
  const [mushafsRaised, setMushafsRaised] = useState(false); // teacher: has this teacher raised?
  
  const { surahs, ayahs, currentSurah, loading, fetchAyahs } = useQuranData();
  const {
    notes,
    bookmarks,
    readingProgress,
    saveNote,
    deleteNote,
    getAyahNote,
    toggleBookmark,
    updateProgress,
  } = useAyahNotes(currentSurah);

  const [selectedAyah, setSelectedAyah] = useState(null);
  const [notePanelOpen, setNotePanelOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');         // 'dark' | 'light' | 'sepia'
  const [fontFamily, setFontFamily] = useState('uthmanic'); // 'uthmanic' | 'naskh' | 'amiri'

  // Socket setup for mushaf collaboration
  useEffect(() => {
    if (!token || !classId) return;
    const socket = createAppSocket(token);
    socketRef.current = socket;
    socket.emit('class:join', { class_id: classId });

    socket.on('mushaf:raised', (data) => {
      if (!isTeacher) setRaisedBanner(data);
    });
    socket.on('mushaf:lowered', () => setRaisedBanner(null));

    return () => {
      socket.emit('class:leave', { class_id: classId });
      socket.disconnect();
    };
  }, [token, classId]);

  const handleRaiseMushaf = () => {
    if (!socketRef.current || !classId) return;
    const surahData = surahs.find(s => s.number === currentSurah);
    socketRef.current.emit('mushaf:raise', {
      class_id: classId,
      surah_id: currentSurah,
      ayah_number: selectedAyah?.number || 1,
      surah_name: surahData?.englishName || '',
    });
    setMushafsRaised(true);
  };

  const handleLowerMushaf = () => {
    if (!socketRef.current || !classId) return;
    socketRef.current.emit('mushaf:lower', { class_id: classId });
    setMushafsRaised(false);
  };

  // Load initial Surah
  useEffect(() => {
    if (surahId) {
      const surahNum = parseInt(surahId);
      if (surahNum >= 1 && surahNum <= 114) {
        fetchAyahs(surahNum);
      }
    } else if (surahs.length > 0) {
      fetchAyahs(1);
    }
  }, [surahId, surahs]);

  // Update reading progress when Ayah is selected
  useEffect(() => {
    if (selectedAyah && ayahs.length > 0) {
      updateProgress(selectedAyah.number, ayahs.length);
    }
  }, [selectedAyah]);

  const handleSurahSelect = (surahNumber) => {
    navigate(`/mushaf/${surahNumber}`);
    fetchAyahs(surahNumber);
    setSelectedAyah(null);
    setNotePanelOpen(false);
    setMobileSidebarOpen(false);
  };

  const handlePreviousSurah = () => {
    if (currentSurah > 1) {
      handleSurahSelect(currentSurah - 1);
    }
  };

  const handleNextSurah = () => {
    if (currentSurah < 114) {
      handleSurahSelect(currentSurah + 1);
    }
  };

  const handleBookmarkToggle = async (ayahNumber) => {
    await toggleBookmark(ayahNumber);
  };

  const currentSurahData = surahs.find((s) => s.number === currentSurah);
  const selectedAyahNote = selectedAyah ? getAyahNote(selectedAyah.number) : null;

  // Page navigation state from AyahDisplay
  const pageNavRef = useRef({ prev: null, next: null, canPrev: false, canNext: false, togglePlay: null });
  const [pageNavState, setPageNavState] = useState({ canPrev: false, canNext: false, isPlaying: false, isLoading: false, pageNumber: null, juz: null, hizb: null });
  const handlePaginationChange = useCallback(({ prevPage, nextPage, canPrevPage, canNextPage, isPlaying, isLoading, togglePlay, pageNumber, juz, hizb }) => {
    pageNavRef.current = { prev: prevPage, next: nextPage, canPrev: canPrevPage, canNext: canNextPage, togglePlay };
    setPageNavState({ canPrev: canPrevPage, canNext: canNextPage, isPlaying, isLoading, pageNumber, juz, hizb });
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col ${PAGE_BG[theme]} transition-colors duration-300`}
      style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}
    >
      {/* Compact top header similar to quran.com mobile */}
      <header
        className={`shrink-0 z-20 border-b pt-[env(safe-area-inset-top)] ${
          theme === 'dark' ? 'border-white/5 bg-[#0d1118]/98' :
          theme === 'sepia' ? 'border-[#c4a97d]/30 bg-[#fdf6e3]/98' :
          'border-slate-200 bg-white'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 px-3 pb-1 pt-1.5 ${
            theme === 'dark' ? 'text-white/55' : theme === 'sepia' ? 'text-[#8b6d4a]' : 'text-slate-500'
          }`}
        >
          <button
            onClick={() => navigate(token ? '/dashboard' : '/')}
            className={`rounded-lg p-1 transition ${
              theme === 'dark' ? 'hover:bg-white/10' : theme === 'sepia' ? 'hover:bg-[#ede0c4]' : 'hover:bg-slate-100'
            }`}
            aria-label="Back"
          >
            <FaArrowLeft className="text-xs" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-tight">
            <FaBookmark className="text-[9px] opacity-60" />
            <span>Page {pageNavState.pageNumber ?? '--'}</span>
          </div>

          <div className="text-[11px] font-semibold tracking-tight">
            {pageNavState.juz ? `Juz ${pageNavState.juz}` : '--'}
            {pageNavState.hizb ? ` / Hizb ${pageNavState.hizb}` : ''}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl px-2 py-1 text-[15px] font-bold leading-none transition ${
              theme === 'dark' ? 'text-white hover:bg-white/8' :
              theme === 'sepia' ? 'text-[#3d2b1f] hover:bg-[#ede0c4]' :
              'text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="max-w-[50vw] truncate">
              {currentSurahData ? `${currentSurahData.number}. ${currentSurahData.englishName}` : 'Holy Mushaf'}
            </span>
            <FaChevronDown className="shrink-0 text-[9px] opacity-70" />
          </button>

            <div className="flex items-center gap-0.5">
            <button
              onClick={() => pageNavRef.current.togglePlay?.()}
                className={`rounded-xl p-1.5 transition ${
                pageNavState.isPlaying
                  ? 'bg-[#2d5a56] text-white'
                  : theme === 'dark' ? 'text-white/60 hover:bg-white/10' :
                  theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                  'text-slate-500 hover:bg-slate-100'
              }`}
              title={pageNavState.isPlaying ? 'Pause' : 'Play Surah'}
              aria-label={pageNavState.isPlaying ? 'Pause surah audio' : 'Play surah audio'}
            >
              {pageNavState.isLoading ? <FaVolumeUp className="animate-pulse text-xs" /> :
                pageNavState.isPlaying ? <FaPause className="text-xs" /> : <FaPlay className="text-xs" />}
            </button>

            {isTeacher && classId && (
              mushafsRaised ? (
                <button
                  onClick={handleLowerMushaf}
                  className="hidden items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 sm:inline-flex"
                >
                  <FaTimes className="text-[9px]" /> Lower
                </button>
              ) : (
                <button
                  onClick={handleRaiseMushaf}
                  className="hidden items-center gap-1 rounded-xl bg-[#2d5a56] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#234946] sm:inline-flex"
                >
                  <FaHandPaper className="text-[9px]" /> Raise
                </button>
              )
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`rounded-xl p-1.5 transition ${
                showSettings
                  ? 'bg-[#2d5a56] text-white'
                  : theme === 'dark' ? 'text-white/60 hover:bg-white/10' :
                  theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                  'text-slate-500 hover:bg-slate-100'
              }`}
              aria-label="Open settings"
            >
              <FaCog className="text-xs" />
            </button>
          </div>
        </div>
      </header>

      {/*  Settings Panel  */}
      {showSettings && (
        <>
          <button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[min(90vw,22rem)] flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reading Settings</h2>
                <p className="text-xs text-slate-400">Personalise your Muaf experience</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 space-y-7 p-5">
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Reading Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_PREVIEWS.map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition ${theme === t.id ? 'border-[#2d5a56] shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex h-11 w-full items-center justify-center rounded-xl border text-base" style={{ backgroundColor: t.panelBg, borderColor: t.borderColor, color: t.textColor }}>
                        <span style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '18px' }}></span>
                      </div>
                      <span className={`text-xs font-semibold ${theme === t.id ? 'text-[#2d5a56]' : 'text-slate-500'}`}>{t.label}</span>
                      {theme === t.id && <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#2d5a56]"><FaCheck className="text-[8px] text-white" /></div>}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Arabic Font</h3>
                <div className="space-y-2">
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.id} onClick={() => setFontFamily(f.id)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition ${fontFamily === f.id ? 'border-[#2d5a56] bg-[#edf7f4]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <span className={`text-sm font-medium ${fontFamily === f.id ? 'text-[#2d5a56]' : 'text-slate-700'}`}>{f.label}</span>
                      <span dir="rtl" style={{ fontFamily: f.fontStyle, fontSize: '17px' }} className="text-slate-700"> </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-[#dce5df] bg-[#f5f9f7] p-4">
                <p className="text-xs font-semibold text-[#2d5a56]">Tips</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li> Tap an Ayah to bookmark or add a note</li>
                  <li> Long-press on mobile for the action menu</li>
                  <li> Tap a word to highlight and study it</li>
                </ul>
              </section>
            </div>
          </div>
        </>
      )}

      {/*  Body row (sidebar + main + notes)  */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-72 2xl:w-80 lg:flex-col overflow-hidden shrink-0">
          <SurahSidebar
            surahs={surahs}
            currentSurah={currentSurah}
            onSurahSelect={handleSurahSelect}
            bookmarks={bookmarks}
            loading={loading}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <>
            <button type="button" aria-label="Close Surah list" className="fixed inset-0 z-40 bg-[#102125]/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-[min(85vw,22rem)] max-w-full p-3 lg:hidden flex flex-col">
              <SurahSidebar
                surahs={surahs}
                currentSurah={currentSurah}
                onSurahSelect={handleSurahSelect}
                bookmarks={bookmarks}
                loading={loading}
              />
            </div>
          </>
        )}

        {/* Main reading area */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <AyahDisplay
            ayahs={ayahs}
            surahName={currentSurahData?.name || ''}
            surahNameEng={currentSurahData?.englishName || 'Quran'}
            surahRevealedIn={currentSurahData?.revelationType || ''}
            numberOfAyahs={currentSurahData?.numberOfAyahs || 0}
            currentSurahNumber={currentSurah}
            loading={loading}
            bookmarks={bookmarks}
            onBookmarkToggle={handleBookmarkToggle}
            onOpenNotes={(ayah) => { setSelectedAyah(ayah); setNotePanelOpen(true); }}
            selectedAyah={selectedAyah}
            theme={theme}
            fontFamily={fontFamily}
            onPaginationChange={handlePaginationChange}
          />
        </div>

        {/* Notes side drawer  xl+ only */}
        {notePanelOpen && selectedAyah && (
          <div className="hidden xl:flex xl:w-80 xl:shrink-0 xl:flex-col overflow-y-auto border-l border-white/10">
            <NotesPanel
              selectedAyah={selectedAyah}
              note={selectedAyahNote}
              onSaveNote={saveNote}
              onDeleteNote={deleteNote}
              onClose={() => setNotePanelOpen(false)}
              readingProgress={readingProgress[currentSurah] || 0}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/*  Mobile Bottom Nav (5 buttons)  */}
      <nav className={`shrink-0 z-30 border-t px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)] lg:hidden ${
        theme === 'dark'  ? 'border-white/5 bg-[#0d1118]/98 backdrop-blur' :
        theme === 'sepia' ? 'border-[#c4a97d]/30 bg-[#fdf6e3]/98 backdrop-blur' :
                            'border-slate-200 bg-white/98 backdrop-blur'
      }`}>
        <div className="grid grid-cols-5 gap-1">
          {/* Prev Surah */}
          <button
            onClick={handlePreviousSurah}
            disabled={currentSurah <= 1}
            title="Previous Surah"
            aria-label="Previous Surah"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition disabled:opacity-30 ${
              theme === 'dark'  ? 'text-white/60 hover:bg-white/8 disabled:text-white/20' :
              theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                                  'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <FaChevronLeft className="text-[9px]" />
              <FaChevronLeft className="text-[9px]" />
            </div>
          </button>

          {/* Prev Page */}
          <button
            onClick={() => pageNavRef.current.prev?.()}
            disabled={!pageNavState.canPrev}
            title="Previous Page"
            aria-label="Previous Page"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition disabled:opacity-30 ${
              theme === 'dark'  ? 'text-white/60 hover:bg-white/8 disabled:text-white/20' :
              theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                                  'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FaChevronLeft className="text-sm" />
          </button>

          {/* Surahs (centre) */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            title="Surah List"
            aria-label="Surah List"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#2d5a56] py-1.5 text-[10px] font-bold text-white transition hover:bg-[#234946]"
          >
            <FaBookOpen className="text-sm" />
          </button>

          {/* Next Page */}
          <button
            onClick={() => pageNavRef.current.next?.()}
            disabled={!pageNavState.canNext}
            title="Next Page"
            aria-label="Next Page"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition disabled:opacity-30 ${
              theme === 'dark'  ? 'text-white/60 hover:bg-white/8 disabled:text-white/20' :
              theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                                  'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FaChevronRight className="text-sm" />
          </button>

          {/* Next Surah */}
          <button
            onClick={handleNextSurah}
            disabled={currentSurah >= 114}
            title="Next Surah"
            aria-label="Next Surah"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition disabled:opacity-30 ${
              theme === 'dark'  ? 'text-white/60 hover:bg-white/8 disabled:text-white/20' :
              theme === 'sepia' ? 'text-[#7a5c3a] hover:bg-[#ede0c4]' :
                                  'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <FaChevronRight className="text-[9px]" />
              <FaChevronRight className="text-[9px]" />
            </div>
          </button>
        </div>
      </nav>

      {/* Bottom Notes Panel  mobile/tablet only */}
      {notePanelOpen && (
        <div className="xl:hidden shrink-0">
          <NotesPanel
            selectedAyah={selectedAyah}
            note={selectedAyahNote}
            onSaveNote={saveNote}
            onDeleteNote={deleteNote}
            onClose={() => setNotePanelOpen(false)}
            readingProgress={readingProgress[currentSurah] || 0}
            loading={loading}
          />
        </div>
      )}

      {/* Teacher raised Mushaf banner */}
      {raisedBanner && !isTeacher && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-4">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#c8dcd9] bg-[#2d5a56] px-5 py-4 text-white shadow-2xl">
            <FaChalkboardTeacher className="shrink-0 text-xl text-teal-200" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Teacher is showing the Muaf</p>
              <p className="truncate text-xs text-teal-200">
                {raisedBanner.surah_name ? `Surah ${raisedBanner.surah_name}` : `Surah ${raisedBanner.surah_id}`}
                {raisedBanner.ayah_number > 1 ? `  Ayah ${raisedBanner.ayah_number}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { handleSurahSelect(raisedBanner.surah_id); setRaisedBanner(null); }} className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25">
                Follow
              </button>
              <button onClick={() => setRaisedBanner(null)} className="rounded-xl p-1.5 text-teal-200 transition hover:text-white" aria-label="Dismiss">
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
