import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  FaBookmark,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaPause,
  FaPlay,
  FaRegBookmark,
  FaScroll,
  FaShareAlt,
  FaTimes,
  FaVolumeUp,
} from 'react-icons/fa';
import API from '../../services/api';
import { quranCache } from '../../db/dexie';

const RECITERS = [
  { id: 'ar.alafasy',            label: 'Mishary Alafasy',           cdn: 'ar.alafasy' },
  { id: 'ar.husary',             label: 'Mahmoud Khalil Al-Husary',  cdn: 'ar.husary' },
  { id: 'ar.abdurrahmaansudais', label: 'Abdul Rahman Al-Sudais',    cdn: 'ar.abdurrahmaansudais' },
  { id: 'ar.saoodshuraym',       label: 'Saood Al-Shuraym',          cdn: 'ar.saoodshuraym' },
];

// Cumulative ayah offsets per surah (index 0 = surah 1).
// SURAH_STARTS[n-1] = total ayahs in all surahs before surah n.
// Global ayah number = SURAH_STARTS[surahNumber - 1] + ayahNumberInSurah
// Verified against Hafs narration (6236 total ayahs).
const SURAH_STARTS = [
  0, 7, 293, 493, 669, 789, 954, 1160, 1235, 1364, 1473, 1596, 1707, 1750, 1802, 1901,
  2029, 2140, 2250, 2348, 2483, 2595, 2673, 2791, 2855, 2932, 3159, 3252, 3340, 3409,
  3469, 3503, 3533, 3606, 3660, 3705, 3788, 3970, 4058, 4133, 4218, 4272, 4325, 4414,
  4473, 4510, 4545, 4583, 4612, 4630, 4675, 4735, 4784, 4846, 4901, 4979, 5075, 5104,
  5126, 5150, 5163, 5177, 5188, 5199, 5217, 5229, 5241, 5271, 5323, 5375, 5419, 5447,
  5475, 5495, 5551, 5591, 5622, 5672, 5712, 5758, 5800, 5829, 5848, 5884, 5909, 5931,
  5948, 5967, 5993, 6023, 6043, 6058, 6079, 6090, 6098, 6106, 6125, 6130, 6138, 6146,
  6157, 6168, 6176, 6179, 6188, 6193, 6197, 6204, 6207, 6213, 6216, 6221, 6225, 6230,
];

function getAudioUrl(reciterId, surahNumber, ayahNumber) {
  const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
  const globalNum = SURAH_STARTS[surahNumber - 1] + ayahNumber;
  return `https://cdn.islamic.network/quran/audio/128/${reciter.cdn}/${globalNum}.mp3`;
}

const QURAN_FONT_FAMILY = '"KFGQPC Uthman Taha Naskh", "KFGQPC Hafs Uthmanic Script", "Noto Naskh Arabic", serif';

const FONT_FAMILY_MAP = {
  uthmanic: '"UthmanicHafs", "KFGQPC HAFS Uthmanic Script", "Noto Naskh Arabic", serif',
  naskh:    '"Noto Naskh Arabic", "Traditional Arabic", serif',
  amiri:    '"Amiri", "Noto Naskh Arabic", serif',
};

// Theme token map  every colour decision lives here
const T = {
  dark: {
    container:   'border-white/5 bg-[#0d1118]',
    header:      'bg-[#121826] border-white/8',
    surahLabel:  'text-[#7a9992]',
    surahName:   'text-white',
    surahSub:    'text-white/60',
    controls:    'border-white/10 bg-[#0f1624]',
    pageBg:      'bg-[#111827]',
    pageNav:     'border-white/10 bg-[#101727]',
    pageNavText: 'text-white/70',
    sectionWrap: 'border-white/8 bg-[linear-gradient(180deg,#11161f_0%,#0b0f16_100%)]',
    sectionInfo: 'border-white/10 text-white/55',
    article:     'border-white/6 bg-[#0d1118]',
    textClass:   'text-white',
    nonCurrentText: 'text-white/80',
    focusedBg:   'bg-[#1b2433]',
    markerNormal:     { bg: '#1a2230', border: '#6f7c97', color: '#d8e1ff' },
    markerBookmarked: { bg: '#233253', border: '#7fa2ff', color: '#eff4ff' },
    basmala:          'text-[#c9b97a]',
    basmalaDivider:   'rgba(255,255,255,0.15)',
    basmalaDot:       'rgba(255,255,255,0.3)',
    pageNum:     'border-white/10 text-white/55',
    pageDivider: 'bg-white/10',
    wordHover:   'hover:bg-white/10 hover:text-[#b6f2d6]',
    wordSelected:'bg-[#2d6b5e] text-[#a8f0d6]',
    selBanner:   'bg-[#0d1f1c] border-[#2d6b5e]',
    selLabel:    'text-[#7ecfb3]',
    selText:     'text-white',
    selBtn:      'border-white/10 text-white/60 hover:text-white',
    mobileNav:   'border-[#dde5e0] bg-white/95',
    mobilePlay:  'bg-[#e7f3ef] text-[#234946]',
    mobileBtn:   'text-slate-500 hover:bg-[#f3f6f4]',
    mobileDis:   'text-slate-300',
    mobilePage:  'text-slate-500',
    action:      'border-[#3a3f46] bg-[#1f2329]',
    actionBdr:   'border-white/10',
    actionLbl:   'text-[#8fb9ff]',
    actionSub:   'text-white/75',
    actionItem:  'text-white/90 hover:bg-white/6',
    actionIcon:  'text-white/60',
    actionClose: 'text-white/45 hover:bg-white/6 hover:text-white/80',
    loadingWrap: 'border-white/8 bg-[#0d1118]',
    loadingText: 'text-white/65',
  },
  light: {
    container:   'border-slate-200 bg-white',
    header:      'bg-white border-slate-200',
    surahLabel:  'text-[#7a9992]',
    surahName:   'text-slate-900',
    surahSub:    'text-slate-500',
    controls:    'border-slate-200 bg-slate-50',
    pageBg:      'bg-slate-50',
    pageNav:     'border-slate-200 bg-slate-50',
    pageNavText: 'text-slate-600',
    sectionWrap: 'border-slate-200 bg-slate-100',
    sectionInfo: 'border-slate-200 text-slate-500',
    article:     'border-slate-200 bg-white',
    textClass:   'text-slate-900',
    nonCurrentText: 'text-slate-500',
    focusedBg:   'bg-slate-100',
    markerNormal:     { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569' },
    markerBookmarked: { bg: '#dbeafe', border: '#93c5fd', color: '#1d4ed8' },
    basmala:          'text-[#8a6914]',
    basmalaDivider:   'rgba(148,163,184,0.4)',
    basmalaDot:       'rgba(148,163,184,0.8)',
    pageNum:     'border-slate-200 text-slate-500',
    pageDivider: 'bg-slate-200',
    wordHover:   'hover:bg-slate-100 hover:text-[#2d5a56]',
    wordSelected:'bg-[#dcfce7] text-[#166534]',
    selBanner:   'bg-[#f0fdf4] border-[#86efac]',
    selLabel:    'text-[#16a34a]',
    selText:     'text-slate-900',
    selBtn:      'border-slate-300 text-slate-500 hover:text-slate-800',
    mobileNav:   'border-slate-200 bg-white/95',
    mobilePlay:  'bg-[#e7f3ef] text-[#234946]',
    mobileBtn:   'text-slate-500 hover:bg-slate-100',
    mobileDis:   'text-slate-300',
    mobilePage:  'text-slate-500',
    action:      'border-slate-200 bg-white shadow-xl',
    actionBdr:   'border-slate-100',
    actionLbl:   'text-[#2d5a56]',
    actionSub:   'text-slate-600',
    actionItem:  'text-slate-800 hover:bg-slate-50',
    actionIcon:  'text-slate-400',
    actionClose: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
    loadingWrap: 'border-slate-200 bg-white',
    loadingText: 'text-slate-500',
  },
  sepia: {
    container:   'border-[#c4a97d]/50 bg-[#fdf6e3]',
    header:      'bg-[#fdf6e3] border-[#c4a97d]/30',
    surahLabel:  'text-[#a67c52]',
    surahName:   'text-[#3d2b1f]',
    surahSub:    'text-[#7a5c3a]',
    controls:    'border-[#c4a97d]/40 bg-[#f2e8d0]',
    pageBg:      'bg-[#f5ead7]',
    pageNav:     'border-[#c4a97d]/40 bg-[#ede0c4]',
    pageNavText: 'text-[#5c4033]',
    sectionWrap: 'border-[#c4a97d] bg-[#e8d9b8]',
    sectionInfo: 'border-[#c4a97d]/40 text-[#8b6d4a]',
    article:     'border-[#c4a97d]/40 bg-[#fdf6e3]',
    textClass:   'text-[#3d2b1f]',
    nonCurrentText: 'text-[#7a5c3a]',
    focusedBg:   'bg-[#ede0c4]',
    markerNormal:     { bg: '#ede0c8', border: '#c4a97d', color: '#7a5c3a' },
    markerBookmarked: { bg: '#e0c98a', border: '#9b7e3f', color: '#5c3d11' },
    basmala:          'text-[#8a6914]',
    basmalaDivider:   'rgba(196,169,125,0.5)',
    basmalaDot:       'rgba(196,169,125,0.9)',
    pageNum:     'border-[#c4a97d]/40 text-[#8b6d4a]',
    pageDivider: 'bg-[#c4a97d]/40',
    wordHover:   'hover:bg-[#ede0c4] hover:text-[#5c3d11]',
    wordSelected:'bg-[#e0c98a] text-[#5c3d11]',
    selBanner:   'bg-[#ede0c4] border-[#c4a97d]',
    selLabel:    'text-[#8a6914]',
    selText:     'text-[#3d2b1f]',
    selBtn:      'border-[#c4a97d]/50 text-[#7a5c3a] hover:text-[#3d2b1f]',
    mobileNav:   'border-[#c4a97d]/40 bg-[#fdf6e3]/95',
    mobilePlay:  'bg-[#e0c98a] text-[#5c3d11]',
    mobileBtn:   'text-[#7a5c3a] hover:bg-[#ede0c4]',
    mobileDis:   'text-[#c4a97d]/50',
    mobilePage:  'text-[#8b6d4a]',
    action:      'border-[#c4a97d]/60 bg-[#fdf6e3]',
    actionBdr:   'border-[#c4a97d]/30',
    actionLbl:   'text-[#8a6914]',
    actionSub:   'text-[#5c4033]',
    actionItem:  'text-[#3d2b1f] hover:bg-[#ede0c4]',
    actionIcon:  'text-[#a67c52]',
    actionClose: 'text-[#a67c52] hover:bg-[#ede0c4] hover:text-[#3d2b1f]',
    loadingWrap: 'border-[#c4a97d]/50 bg-[#fdf6e3]',
    loadingText: 'text-[#7a5c3a]',
  },
};

export const AyahDisplay = ({
  ayahs,
  surahName,
  surahNameEng,
  surahRevealedIn,
  numberOfAyahs,
  currentSurahNumber,
  loading,
  bookmarks,
  onBookmarkToggle,
  onOpenNotes,
  selectedAyah,
  theme = 'dark',
  fontFamily = 'uthmanic',
  onPaginationChange,
}) => {
  const tk = T[theme] || T.dark;
  const resolvedFont = FONT_FAMILY_MAP[fontFamily] || FONT_FAMILY_MAP.uthmanic;
  const [fontSize, setFontSize] = useState(28);
  const [focusedAyah, setFocusedAyah] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [pageContentMap, setPageContentMap] = useState({});
  const [pageContentLoading, setPageContentLoading] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [surahAudioState, setSurahAudioState] = useState({
    loading: false,
    playing: false,
    currentIndex: 0,
    error: '',
  });
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef({ key: null, time: 0 });
  const audioRef = useRef(null);
  const surahAudioStateRef = useRef(surahAudioState);
  const [selectedWord, setSelectedWord] = useState(null); // { ayahKey, wordIndex, word }
  const audioUrlCache = useRef({}); // { "reciter|surah:ayah": url }

  const toArabicNumber = (value) => {
    if (value === null || value === undefined) return '';

    return String(value).replace(/\d/g, (digit) => ''[Number(digit)]);
  };

  const pages = useMemo(() => {
    if (!ayahs || ayahs.length === 0) return [];

    const hasRealPageNumbers = ayahs.some((ayah) => ayah.page);

    if (hasRealPageNumbers) {
      const groupedPages = [];
      let currentPage = null;

      ayahs.forEach((ayah) => {
        if (!currentPage || currentPage.pageNumber !== ayah.page) {
          currentPage = {
            pageNumber: ayah.page,
            ayahs: [],
          };
          groupedPages.push(currentPage);
        }

        currentPage.ayahs.push(ayah);
      });

      return groupedPages;
    }

    const fallbackPages = [];
    let currentPage = [];
    let currentWeight = 0;
    const pageWeightLimit = 950;

    ayahs.forEach((ayah) => {
      const weight = Math.max(80, ayah.text.length);

      if (currentPage.length > 0 && currentWeight + weight > pageWeightLimit) {
        fallbackPages.push({
          pageNumber: fallbackPages.length + 1,
          ayahs: currentPage,
        });
        currentPage = [];
        currentWeight = 0;
      }

      currentPage.push(ayah);
      currentWeight += weight;
    });

    if (currentPage.length > 0) {
      fallbackPages.push({
        pageNumber: fallbackPages.length + 1,
        ayahs: currentPage,
      });
    }

    return fallbackPages;
  }, [ayahs]);

  useEffect(() => {
    surahAudioStateRef.current = surahAudioState;
  }, [surahAudioState]);

  //  Cache-first single-page loader 
  const loadPage = useCallback(async (pageNumber, signal) => {
    if (!pageNumber) return null;
    // 1. Dexie cache
    try {
      const cached = await quranCache.getPage(pageNumber);
      if (cached) return cached;
    } catch { /* ignore */ }
    // 2. Network
    if (signal?.aborted) return null;
    const response = await API.get(`/api/quran/pages/${pageNumber}`);
    const ayahRows = (response.data?.data?.ayahs || []).map((ayah) => ({
      ...ayah,
      isCurrentSurah: ayah.surahNumber === currentSurahNumber,
    }));
    quranCache.setPage(pageNumber, ayahRows).catch(() => {});
    return ayahRows;
  }, [currentSurahNumber]);

  //  Load visible page, then lazily prefetch neighbours 
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      const currentPage = pages[currentPageIndex];
      if (!currentPage?.pageNumber) {
        setPageContentMap({});
        return;
      }

      setPageContentLoading(true);
      try {
        // Load visible page first
        const rows = await loadPage(currentPage.pageNumber, controller.signal);
        if (controller.signal.aborted) return;
        if (rows) {
          setPageContentMap((prev) => ({ ...prev, [currentPage.pageNumber]: rows }));
        }
        setPageContentLoading(false);

        // Prefetch prev / next pages in background after 300ms idle
        await new Promise((r) => setTimeout(r, 300));
        if (controller.signal.aborted) return;

        const neighbours = [
          pages[currentPageIndex - 1]?.pageNumber,
          pages[currentPageIndex + 1]?.pageNumber,
        ].filter(Boolean);

        for (const pn of neighbours) {
          if (controller.signal.aborted) break;
          setPageContentMap((prev) => {
            if (prev[pn]) return prev; // already loaded
            return prev;
          });
          loadPage(pn, controller.signal).then((r) => {
            if (r && !controller.signal.aborted) {
              setPageContentMap((prev) => prev[pn] ? prev : { ...prev, [pn]: r });
            }
          }).catch(() => {});
        }
      } catch {
        if (!controller.signal.aborted) setPageContentLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [currentPageIndex, pages, loadPage]);

  async function playSurahAyahAtIndex(index) {
    const ayah = ayahs[index];
    if (!ayah) return;

    setSurahAudioState({ loading: true, playing: false, currentIndex: index, error: '' });

    try {
      // Build the CDN URL directly — no API round-trip, user gesture stays valid
      const audioUrl = getAudioUrl(selectedReciter, currentSurahNumber, ayah.number);

      const el = audioRef.current;
      if (!el) return;

      el.src = audioUrl;
      el.load();

      // Wait until enough data buffered, then play
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          el.removeEventListener('canplay', onOk);
          el.removeEventListener('error', onErr);
        };
        const onOk  = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); reject(new Error('Audio failed to load')); };
        el.addEventListener('canplay', onOk);
        el.addEventListener('error', onErr);
        // Timeout fallback: some browsers fire neither event on cached files
        setTimeout(() => { cleanup(); resolve(); }, 3000);
      });

      await el.play();
      setSurahAudioState({ loading: false, playing: true, currentIndex: index, error: '' });
    } catch {
      setSurahAudioState({ loading: false, playing: false, currentIndex: index, error: 'Could not play audio.' });
    }
  }

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement) return undefined;

    const handlePlay = () => {
      setSurahAudioState((current) => ({ ...current, playing: true, loading: false, error: '' }));
    };

    const handlePause = () => {
      setSurahAudioState((current) => ({ ...current, playing: false, loading: false }));
    };

    const handleEnded = async () => {
      const current = surahAudioStateRef.current;

      if (current.currentIndex < ayahs.length - 1) {
        await playSurahAyahAtIndex(current.currentIndex + 1);
      } else {
        setSurahAudioState((state) => ({ ...state, playing: false, loading: false }));
      }
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [ayahs, selectedReciter, currentSurahNumber]);

  useEffect(() => {
    setFocusedAyah(null);
    setPageContentMap({});
    setCurrentPageIndex(0);
    setSelectedWord(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setSurahAudioState({ loading: false, playing: false, currentIndex: 0, error: '' });

    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSurahNumber]);

  const stopLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const getAyahKey = (ayah) => `${ayah.surahNumber}:${ayah.number}`;

  const calculateMenuPosition = (target) => {
    const rect = target.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 220;
    const viewportPadding = 12;

    const nextLeft = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth + 12)
    );

    const nextTop = rect.bottom + 12 + menuHeight > window.innerHeight
      ? Math.max(viewportPadding, rect.top - menuHeight - 12)
      : rect.bottom + 12;

    return { left: nextLeft, top: nextTop };
  };

  const openAyahActions = (ayah, target) => {
    if (!ayah.isCurrentSurah) return;

    setFocusedAyah(ayah);
    if (target) {
      setMenuPosition(calculateMenuPosition(target));
    }
  };

  const startLongPress = (ayah) => {
    if (!ayah.isCurrentSurah) return;

    stopLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      const activeTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openAyahActions(ayah, activeTarget);
      longPressTimerRef.current = null;
    }, 420);
  };

  const handleAyahTap = (ayah, target) => {
    if (!ayah.isCurrentSurah) return;

    const ayahKey = getAyahKey(ayah);
    const now = Date.now();
    const isDoubleTap = lastTapRef.current.key === ayahKey && now - lastTapRef.current.time < 320;

    lastTapRef.current = { key: ayahKey, time: now };
    openAyahActions(ayah, target);

    if (isDoubleTap) {
      openAyahActions(ayah, target);
    }
  };

  const handleAyahPointerUp = (ayah, target) => {
    stopLongPressTimer();

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    handleAyahTap(ayah, target);
  };

  const handleOpenNotes = () => {
    if (!focusedAyah) return;
    onOpenNotes(focusedAyah);
    setFocusedAyah(null);
  };

  const handleShareAyah = async () => {
    if (!focusedAyah) return;
    const surahName = focusedAyah.surahEnglishName || focusedAyah.surahName || `Surah ${focusedAyah.surahNumber}`;
    const ref = `${surahName} ${focusedAyah.surahNumber}:${focusedAyah.numberInSurah}`;
    const arabic = focusedAyah.text || '';
    const translation = focusedAyah.translation || '';
    const shareText = `${ref}\n${arabic}${translation ? '\n' + translation : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    } catch { /* user cancelled or denied */ }
    setFocusedAyah(null);
  };

  const handleToggleBookmark = async () => {
    if (!focusedAyah) return;

    await onBookmarkToggle(focusedAyah.number);
  };

  const handleToggleSurahPlayback = async () => {
    if (!ayahs || ayahs.length === 0) return;

    if (surahAudioState.playing) {
      audioRef.current?.pause();
      return;
    }

    if (audioRef.current?.src && !surahAudioState.loading) {
      try {
        await audioRef.current.play();
      } catch {
        setSurahAudioState((current) => ({ ...current, error: 'Playback was blocked by the browser.' }));
      }
      return;
    }

    await playSurahAyahAtIndex(surahAudioState.currentIndex || 0);
  };

  const handleCloseActions = () => {
    setFocusedAyah(null);
  };

  const handleReciterChange = (event) => {
    setSelectedReciter(event.target.value);
    audioUrlCache.current = {}; // clear cached URLs for old reciter

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setSurahAudioState({ loading: false, playing: false, currentIndex: 0, error: '' });
  };

  const handlePreviousPage = () => {
    setCurrentPageIndex((current) => Math.max(0, current - 1));
  };

  const handleNextPage = () => {
    setCurrentPageIndex((current) => Math.min(pages.length - 1, current + 1));
  };

  const currentPage = pages[currentPageIndex] || pages[0];
  const currentPageAyahs = currentPage
    ? (pageContentMap[currentPage.pageNumber] || currentPage.ayahs.map((ayah) => ({
        ...ayah,
        isCurrentSurah: ayah.surahNumber === currentSurahNumber,
      })))
    : [];
  const currentPageJuz = currentPageAyahs[0]?.juz;
  const currentPageHizbQuarter = currentPageAyahs[0]?.hizbQuarter;
  const currentPageHizb = currentPageHizbQuarter ? Math.ceil(currentPageHizbQuarter / 4) : null;
  const currentPageSurahNames = [...new Set(currentPageAyahs.map((ayah) => ayah.surahName).filter(Boolean))];

  useEffect(() => {
    if (!onPaginationChange) return;

    onPaginationChange({
      prevPage: handlePreviousPage,
      nextPage: handleNextPage,
      canPrevPage: currentPageIndex > 0,
      canNextPage: currentPageIndex < pages.length - 1,
      isPlaying: surahAudioState.playing,
      isLoading: surahAudioState.loading,
      togglePlay: handleToggleSurahPlayback,
      pageNumber: currentPage?.pageNumber || null,
      juz: currentPageJuz || null,
      hizb: currentPageHizb,
    });
  }, [
    onPaginationChange,
    currentPageIndex,
    pages.length,
    surahAudioState.playing,
    surahAudioState.loading,
    currentPage?.pageNumber,
    currentPageJuz,
    currentPageHizb,
  ]);

  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center rounded-none border-0 ${tk.loadingWrap} sm:rounded-4xl sm:border sm:shadow-[0_18px_40px_rgba(17,24,39,0.05)]`}>
        <div className="text-center">
          <div className="inline-block animate-spin">
            <FaScroll className="text-3xl text-[#2d5a56]" />
          </div>
          <p className={`mt-3 text-sm ${tk.loadingText}`}>Loading Muaf pages...</p>
        </div>
      </div>
    );
  }

  if (!ayahs || ayahs.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center rounded-none border-0 ${tk.loadingWrap} sm:rounded-4xl sm:border sm:shadow-[0_18px_40px_rgba(17,24,39,0.05)]`}>
        <p className={`text-lg ${tk.loadingText}`}>Select a Surah to begin</p>
      </div>
    );
  }

  return (
    <div className={`h-full min-h-0 overflow-hidden rounded-none border-0 ${tk.container} transition-colors duration-300 sm:rounded-4xl sm:border sm:shadow-[0_20px_55px_rgba(17,24,39,0.06)] flex flex-col`}>
      <div className={`hidden shrink-0 border-b ${tk.header} px-4 py-4 sm:block sm:px-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.26em] ${tk.surahLabel}`}>Muaf Reading</p>
            <h2 className={`truncate text-xl font-semibold sm:text-2xl ${tk.surahName}`} style={{ fontFamily: QURAN_FONT_FAMILY }}>
              {surahName}
            </h2>
            <div className={`mt-1 flex items-center gap-2 text-sm ${tk.surahSub}`}>
              <span>{surahNameEng}</span>
              {surahRevealedIn && (
                <>
                  <span className="opacity-40"></span>
                  <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{surahRevealedIn}</span>
                </>
              )}
              {numberOfAyahs > 0 && (
                <>
                  <span className="opacity-40"></span>
                  <span>{toArabicNumber(numberOfAyahs)} Ayahs</span>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[auto_minmax(180px,220px)_minmax(180px,220px)] lg:items-center">
            <div className={`hidden items-center gap-2 rounded-2xl border ${tk.controls} p-1 sm:flex`}>
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPageIndex === 0}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-30 ${tk.pageNavText} hover:bg-white/10`}
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                onClick={handleToggleSurahPlayback}
                className="inline-flex min-w-38 items-center justify-center gap-2 rounded-xl bg-[#2d5a56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
              >
                {surahAudioState.loading ? <FaVolumeUp className="animate-pulse" /> : surahAudioState.playing ? <FaPause /> : <FaPlay />}
                {surahAudioState.loading ? 'Loading' : surahAudioState.playing ? 'Pause Surah' : 'Listen Surah'}
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPageIndex === pages.length - 1}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-30 ${tk.pageNavText} hover:bg-white/10`}
              >
                <FaChevronRight />
              </button>
            </div>

            <div className={`flex items-center gap-2 rounded-2xl border ${tk.controls} px-3 py-2.5`}>
              <label className={`text-xs font-semibold uppercase tracking-[0.16em] ${tk.surahSub}`}>Size</label>
              <input
                type="range"
                min="20"
                max="40"
                value={fontSize}
                onChange={(event) => setFontSize(parseInt(event.target.value, 10))}
                className="min-w-0 flex-1 accent-[#2d5a56]"
              />
              <span className={`w-8 text-sm ${tk.surahSub}`}>{fontSize}</span>
            </div>

            <select
              value={selectedReciter}
              onChange={handleReciterChange}
              className={`rounded-2xl border ${tk.controls} px-4 py-3 text-sm outline-none transition focus:border-[#7ea89c] ${tk.surahName}`}
            >
              {RECITERS.map((reciter) => (
                <option key={reciter.id} value={reciter.id}>
                  {reciter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

        <div className={`${tk.pageBg} min-h-0 flex-1 overflow-y-auto transition-colors duration-300`}>
          <div className="mx-auto w-full max-w-245 px-0 py-0 sm:px-5 sm:py-5 lg:px-8">
            <div className={`mb-4 hidden items-center justify-between rounded-3xl border ${tk.pageNav} px-4 py-3 sm:flex`}>
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={currentPageIndex === 0}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${tk.pageNavText} hover:bg-black/5`}
            >
              <FaChevronLeft /> Previous Page
            </button>
            <div className={`text-sm font-semibold ${tk.pageNavText}`}>
              Page {toArabicNumber(currentPage?.pageNumber)} of {toArabicNumber(pages.length)}
            </div>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPageIndex === pages.length - 1}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${tk.pageNavText} hover:bg-black/5`}
            >
              Next Page <FaChevronRight />
            </button>
          </div>

          {/*  Main page section  */}
          <section className={`rounded-none border-x-0 border-y ${tk.sectionWrap} p-3 shadow-none sm:rounded-[30px] sm:border sm:p-6 sm:shadow-[0_26px_60px_rgba(17,24,39,0.18)]`}>
            {/* Page header: surah name(s) left, juz + page right */}
            <div className={`mb-5 flex items-center justify-between gap-4 border-b ${tk.sectionInfo} pb-4 text-sm`}>
              <div className="truncate" style={{ fontFamily: QURAN_FONT_FAMILY }}>
                {currentPageSurahNames.join('  ') || surahName}
              </div>
              <div className="shrink-0">
                {currentPageJuz ? ` ${toArabicNumber(currentPageJuz)}` : ''}{currentPageJuz ? '  ' : ''} {toArabicNumber(currentPage?.pageNumber)}
              </div>
            </div>

            {/* Page content with fade-in animation on page change */}
            <article
              key={`page-${currentPage?.pageNumber}`}
              className={`rounded-xl border ${tk.article} px-3 py-6 sm:rounded-3xl sm:px-8 sm:py-10 lg:px-12`}
              style={{ animation: 'mushafFadeIn 0.35s ease' }}
            >
              {/*  Surah header inside the page (on page 1 of each surah)  */}
              {currentPageIndex === 0 && (
                <div className="mb-6 text-center select-none" style={{ animation: 'mushafSlideUp 0.4s ease' }}>
                  {/* Top ornamental border */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1" style={{ background: tk.basmalaDivider }} />
                    <svg width="120" height="14" viewBox="0 0 120 14">
                      <line x1="0" y1="7" x2="30" y2="7" stroke={tk.basmalaDivider} strokeWidth="1"/>
                      <polygon points="34,7 37,4 40,7 37,10" fill={tk.basmalaDot}/>
                      <polygon points="44,7 47,4 50,7 47,10" fill={tk.basmalaDot}/>
                      <polygon points="54,7 57,4 60,7 57,10" fill={tk.basmalaDot}/>
                      <polygon points="64,7 67,4 70,7 67,10" fill={tk.basmalaDot}/>
                      <polygon points="74,7 77,4 80,7 77,10" fill={tk.basmalaDot}/>
                      <line x1="84" y1="7" x2="120" y2="7" stroke={tk.basmalaDivider} strokeWidth="1"/>
                    </svg>
                    <div className="h-px flex-1" style={{ background: tk.basmalaDivider }} />
                  </div>

                  {/* Surah name in large Arabic */}
                  <h2
                    dir="rtl"
                    className={`text-3xl font-bold sm:text-4xl ${tk.surahName}`}
                    style={{ fontFamily: resolvedFont, lineHeight: 1.6 }}
                  >
                    {surahName}
                  </h2>
                  <p className={`mt-1 text-sm font-semibold tracking-wide ${tk.surahSub}`}>
                    {surahNameEng}
                    {surahRevealedIn ? `  ${surahRevealedIn}` : ''}
                    {numberOfAyahs > 0 ? `  ${toArabicNumber(numberOfAyahs)} Verses` : ''}
                  </p>

                  {/* Bottom ornamental border */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-px flex-1" style={{ background: tk.basmalaDivider }} />
                    <svg width="120" height="14" viewBox="0 0 120 14">
                      <line x1="0" y1="7" x2="30" y2="7" stroke={tk.basmalaDivider} strokeWidth="1"/>
                      <polygon points="34,7 37,4 40,7 37,10" fill={tk.basmalaDot}/>
                      <polygon points="44,7 47,4 50,7 47,10" fill={tk.basmalaDot}/>
                      <polygon points="54,7 57,4 60,7 57,10" fill={tk.basmalaDot}/>
                      <polygon points="64,7 67,4 70,7 67,10" fill={tk.basmalaDot}/>
                      <polygon points="74,7 77,4 80,7 77,10" fill={tk.basmalaDot}/>
                      <line x1="84" y1="7" x2="120" y2="7" stroke={tk.basmalaDivider} strokeWidth="1"/>
                    </svg>
                    <div className="h-px flex-1" style={{ background: tk.basmalaDivider }} />
                  </div>

                  {/*  Basmala on its own centered line (all surahs except 9)  */}
                  {currentSurahNumber !== 9 && (
                    <p
                      className={`mt-5 text-center text-2xl sm:text-3xl ${tk.basmala}`}
                      dir="rtl"
                      style={{
                        fontFamily: resolvedFont,
                        fontSize: `${fontSize}px`,
                        lineHeight: 2.4,
                        display: 'block',
                        width: '100%',
                      }}
                    >
                         
                    </p>
                  )}
                </div>
              )}

              {/*  Continuous flowing Quran text  */}
              <div
                dir="rtl"
                className={`text-right ${tk.textClass}`}
                style={{
                  fontFamily: resolvedFont,
                  fontSize: `${fontSize}px`,
                  lineHeight: 2.5,
                  wordSpacing: '0.08em',
                  textAlign: 'justify',
                  textAlignLast: 'right',
                }}
              >
                {currentPageAyahs.map((ayah) => {
                  const isCurrentAyah = ayah.isCurrentSurah;
                  const isBookmarked = isCurrentAyah && bookmarks.includes(ayah.number);
                  const isFocused = isCurrentAyah && focusedAyah?.number === ayah.number;
                  const ayahKey = `${ayah.surahNumber}:${ayah.number}`;
                  const mk = isBookmarked ? tk.markerBookmarked : tk.markerNormal;

                  // Ornate SVG star/rosette ayah number marker  inline in the text flow
                  const AyahMarker = () => (
                    <span
                      className="inline-flex items-center justify-center align-middle"
                      style={{ width: '1.9em', height: '1.9em', minWidth: '26px', minHeight: '26px', verticalAlign: 'middle', margin: '0 0.2em' }}
                    >
                      <svg viewBox="0 0 36 36" width="30" height="30">
                        {/* 8-pointed star / classic Mushaf rosette */}
                        <path
                          d="M18 3
                             L20.5 11 L28.5 8.5 L24.5 16
                             L33 18 L24.5 20 L28.5 27.5
                             L20.5 25 L18 33
                             L15.5 25 L7.5 27.5 L11.5 20
                             L3 18 L11.5 16 L7.5 8.5
                             L15.5 11 Z"
                          fill={mk.bg}
                          stroke={mk.border}
                          strokeWidth="0.8"
                        />
                        <text
                          x="18" y="22"
                          textAnchor="middle"
                          fill={mk.color}
                          fontSize={ayah.number > 99 ? '7' : ayah.number > 9 ? '8.5' : '10'}
                          fontFamily="'Manrope', system-ui, sans-serif"
                          fontWeight="700"
                        >
                          {toArabicNumber(ayah.number)}
                        </text>
                      </svg>
                    </span>
                  );

                  // Non-current surah ayahs (shown for context on same page)
                  if (!isCurrentAyah) {
                    return (
                      <span key={ayahKey} className={`${tk.nonCurrentText}`}>
                        {ayah.text}
                        <AyahMarker />
                      </span>
                    );
                  }

                  // Current surah ayahs  word-level interaction
                  const words = ayah.text.split(/\s+/).filter(Boolean);

                  return (
                    <span
                      key={ayahKey}
                      className={`inline transition-all duration-200 rounded-xl px-0.5 ${isFocused ? tk.focusedBg : ''}`}
                      onDoubleClick={(event) => openAyahActions(ayah, event.currentTarget)}
                      onMouseDown={() => startLongPress(ayah)}
                      onMouseUp={(event) => {
                        stopLongPressTimer();
                        if (!longPressTriggeredRef.current) {
                          if (selectedWord?.ayahKey !== ayahKey) {
                            handleAyahTap(ayah, event.currentTarget);
                          }
                        }
                        longPressTriggeredRef.current = false;
                      }}
                      onMouseLeave={stopLongPressTimer}
                      onTouchStart={() => startLongPress(ayah)}
                      onTouchEnd={(event) => handleAyahPointerUp(ayah, event.currentTarget)}
                      onTouchCancel={() => { longPressTriggeredRef.current = false; stopLongPressTimer(); }}
                    >
                      {words.map((word, wi) => {
                        const isWordSelected = selectedWord?.ayahKey === ayahKey && selectedWord?.wordIndex === wi;
                        return (
                          <span
                            key={wi}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWord(isWordSelected ? null : { ayahKey, wordIndex: wi, word });
                              setFocusedAyah(null);
                            }}
                            className={`cursor-pointer rounded-md transition-colors ${
                              isWordSelected ? tk.wordSelected : tk.wordHover
                            }`}
                            style={{ padding: '0 0.06em' }}
                          >
                            {word}
                            {wi < words.length - 1 ? ' ' : ''}
                          </span>
                        );
                      })}
                      <AyahMarker />
                    </span>
                  );
                })}
              </div>

              {/* Page number footer */}
              <div className="mt-10 flex items-center justify-center gap-3">
                <div className={`h-px flex-1 ${tk.pageDivider}`} />
                <div className={`text-sm font-semibold ${tk.pageNum}`} style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
                   {toArabicNumber(currentPage?.pageNumber)} 
                </div>
                <div className={`h-px flex-1 ${tk.pageDivider}`} />
              </div>
            </article>
          </section>

          {pageContentLoading && (
            <div className={`mt-4 rounded-2xl border ${tk.pageNav} px-4 py-3 text-center text-sm ${tk.pageNavText}`}>
              Loading full page content...
            </div>
          )}

          {/* Selected word banner */}
          {selectedWord && (
            <div className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border ${tk.selBanner} px-5 py-3`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${tk.selLabel}`}>Selected Word</p>
                <p
                  className={`text-2xl leading-relaxed ${tk.selText}`}
                  dir="rtl"
                  style={{ fontFamily: resolvedFont }}
                >
                  {selectedWord.word}
                </p>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs transition ${tk.selBtn}`}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {focusedAyah && (
          <div className="fixed inset-0 z-30">
            <button
              type="button"
              aria-label="Close ayah actions"
              className="absolute inset-0"
              onClick={handleCloseActions}
            />
            <div
              className={`absolute z-10 w-[min(88vw,15rem)] overflow-hidden rounded-[18px] border ${tk.action} text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]`}
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            >
              <div className={`border-b ${tk.actionBdr} px-4 py-3`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${tk.actionLbl}`}>Ayah</p>
                <p className={`mt-1 text-sm ${tk.actionSub}`}>Surah {focusedAyah.surahNumber}, Ayah {focusedAyah.number}</p>
              </div>

              <div className="py-2">
                <button
                  onClick={handleToggleBookmark}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition ${tk.actionItem}`}
                >
                  {bookmarks.includes(focusedAyah.number) ? <FaBookmark className={tk.actionIcon} /> : <FaRegBookmark className={tk.actionIcon} />}
                  Save verse
                </button>

                <button
                  onClick={handleOpenNotes}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition ${tk.actionItem}`}
                >
                  <FaEdit className={tk.actionIcon} />
                  Take a note
                </button>

                <button
                  onClick={handleShareAyah}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition ${tk.actionItem}`}
                >
                  <FaShareAlt className={tk.actionIcon} />
                  {navigator.share ? 'Share verse' : 'Copy verse'}
                </button>
              </div>

              <button
                onClick={handleCloseActions}
                className={`absolute right-2 top-2 rounded-full p-2 transition ${tk.actionClose}`}
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
};
