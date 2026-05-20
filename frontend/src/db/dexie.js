import Dexie from "dexie";
export const db = new Dexie("QuranElearningDB");

db.version(1).stores({
  notes: "++id,ayah_id,type,synced",
  videos: "++id,video_id,class_id",
  reels: "++id,reel_id,class_id",
});

// v2 — Quran data cache (TTL-based, never changes so 7-day expiry is fine)
db.version(2).stores({
  notes: "++id,ayah_id,type,synced",
  videos: "++id,video_id,class_id",
  reels: "++id,reel_id,class_id",
  quranSurahs: "number,cachedAt",        // full surahs list
  quranAyahs: "surahNumber,cachedAt",    // ayahs per surah
  quranPages: "pageNumber,cachedAt",     // full page content
});

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const quranCache = {
  async getSurahs() {
    const row = await db.quranSurahs.get(0);
    if (row && Date.now() - row.cachedAt < TTL_MS) return row.data;
    return null;
  },
  async setSurahs(data) {
    await db.quranSurahs.put({ number: 0, data, cachedAt: Date.now() });
  },

  async getAyahs(surahNumber) {
    const row = await db.quranAyahs.get(surahNumber);
    if (row && Date.now() - row.cachedAt < TTL_MS) return row.data;
    return null;
  },
  async setAyahs(surahNumber, data) {
    await db.quranAyahs.put({ surahNumber, data, cachedAt: Date.now() });
  },

  async getPage(pageNumber) {
    const row = await db.quranPages.get(pageNumber);
    if (row && Date.now() - row.cachedAt < TTL_MS) return row.data;
    return null;
  },
  async setPage(pageNumber, data) {
    await db.quranPages.put({ pageNumber, data, cachedAt: Date.now() });
  },
};
