import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

export function useAudioLoader({ server, token }) {

  const fetchAudioFromServer = async (lessonID) => {
    const response = await fetch(`http://${server}:8000/api/audio/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lesson_id: lessonID, full_audio: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    return response;
  };

  /**
   * Mobile: checks cache → uses local file → downloads and caches if missing.
   * Web:    checks IndexedDB → uses cached blob URL → downloads and caches if missing.
   * Returns a URI/URL string ready to load into an audio element or Audio.Sound.
   */
  const resolveAudioURI = async (lessonID, { isDownloaded, getAudioPath } = {}) => {

    // ── MOBILE ────────────────────────────────────────────────────────────────
    if (Platform.OS !== 'web') {
      const downloaded = await isDownloaded(lessonID);

      if (downloaded) {
        return getAudioPath(lessonID);
      }

      const response = await fetchAudioFromServer(lessonID);
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const path = FileSystem.cacheDirectory + `audio-${lessonID}.mp3`;

      await FileSystem.writeAsStringAsync(path, base64Data, { encoding: 'base64' });

      return path;
    }

    // ── WEB ───────────────────────────────────────────────────────────────────
    const cached = await getWebCachedBlobURL(lessonID);

    if (cached) {
      return cached;
    }

    const response = await fetchAudioFromServer(lessonID);
    const blob = await response.blob();

    await saveWebAudioToCache(lessonID, blob);

    return URL.createObjectURL(blob);
  };

  return { resolveAudioURI };
}

// ── IndexedDB helpers (module-level, no React needed) ─────────────────────────

const DB_NAME = 'audio-cache';
const STORE_NAME = 'blobs';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getWebCachedBlobURL(lessonID) {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(String(lessonID));

      req.onsuccess = (e) => {
        const blob = e.target.result;
        resolve(blob ? URL.createObjectURL(blob) : null);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  } catch {
    return null; // IndexedDB unavailable — fall through to download
  }
}

async function saveWebAudioToCache(lessonID, blob) {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(blob, String(lessonID));

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  } catch {
    // Non-fatal — audio will still play, just won't persist
    console.warn('Web audio cache write failed — IndexedDB unavailable');
  }
}