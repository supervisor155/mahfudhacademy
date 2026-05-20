import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { quranCache } from '../db/dexie';

export const useQuranData = () => {
  const [surahs, setSurahs] = useState([]);
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSurah, setCurrentSurah] = useState(1);

  // ── Fetch surahs list (cache-first) ───────────────────────────────────────
  useEffect(() => {
    const loadSurahs = async () => {
      // 1. Try IndexedDB cache first
      try {
        const cached = await quranCache.getSurahs();
        if (cached) {
          setSurahs(cached);
          return; // no network needed
        }
      } catch { /* ignore cache errors */ }

      // 2. Fetch from network
      try {
        setLoading(true);
        const response = await API.get('/api/quran/surahs');
        const data = response.data.data || [];
        setSurahs(data);
        setError(null);
        quranCache.setSurahs(data).catch(() => {});
      } catch (err) {
        console.error('Failed to fetch Surahs:', err);
        setError('Could not load Surahs list');
        setSurahs(FALLBACK_SURAHS);
      } finally {
        setLoading(false);
      }
    };
    loadSurahs();
  }, []);

  // ── Fetch ayahs for a surah (cache-first) ────────────────────────────────
  const fetchAyahs = useCallback(async (surahNumber) => {
    // 1. Try cache
    try {
      const cached = await quranCache.getAyahs(surahNumber);
      if (cached) {
        setAyahs(cached);
        setCurrentSurah(surahNumber);
        setError(null);
        return;
      }
    } catch { /* ignore */ }

    // 2. Fetch from network
    try {
      setLoading(true);
      const response = await API.get(`/api/quran/surahs/${surahNumber}`);
      const surahData = response.data.data;

      const ayahList = (surahData.ayahs || []).map((ayah) => ({
        number: ayah.number,
        text: ayah.text,
        textEng: ayah.textEng || '',
        page: ayah.page || null,
        juz: ayah.juz || null,
        sajdah: ayah.sajdah || false,
        bismillah: ayah.bismillah || false,
        surahNumber: ayah.surahNumber || surahNumber,
        surahName: ayah.surahName || surahData.name,
        surahNameEng: ayah.surahNameEng || surahData.englishName,
      }));

      setAyahs(ayahList);
      setCurrentSurah(surahNumber);
      setError(null);
      quranCache.setAyahs(surahNumber, ayahList).catch(() => {});
    } catch (err) {
      console.error(`Failed to fetch Ayahs for Surah ${surahNumber}:`, err);
      setError(`Could not load Surah ${surahNumber}`);
      setAyahs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const searchSurahs = (query) => {
    if (!query.trim()) return surahs;
    const lowerQuery = query.toLowerCase();
    return surahs.filter((surah) =>
      surah.name.toLowerCase().includes(lowerQuery) ||
      surah.englishName.toLowerCase().includes(lowerQuery) ||
      surah.englishNameTranslation.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    surahs,
    ayahs,
    currentSurah,
    loading,
    error,
    fetchAyahs,
    searchSurahs,
  };
};

// Fallback Surahs for offline mode
const FALLBACK_SURAHS = [
  { number: 1, name: 'الفاتحة', englishName: 'Al-Fatiha', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revealedIn: 'Makkah' },
  { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', numberOfAyahs: 286, revealedIn: 'Madinah' },
  { number: 3, name: 'آل عمران', englishName: 'Ali Imran', englishNameTranslation: 'The Family of Imran', numberOfAyahs: 200, revealedIn: 'Madinah' },
  { number: 4, name: 'النساء', englishName: 'An-Nisa', englishNameTranslation: 'The Women', numberOfAyahs: 176, revealedIn: 'Madinah' },
  { number: 5, name: 'المائدة', englishName: 'Al-Maidah', englishNameTranslation: 'The Table', numberOfAyahs: 120, revealedIn: 'Madinah' },
];
