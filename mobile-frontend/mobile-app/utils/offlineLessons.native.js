
import * as SQLite from 'expo-sqlite';
import { saveLessonToLocalTables } from './localDatabase';

import { getLocalDatabase } from './localDatabase';

const getDatabase = async () => {
    return await getLocalDatabase();
};

export const saveOfflineLesson = async (lessonData) => {
    const db = await getDatabase();

    // Keep the existing offline download record.
    await db.runAsync(
        `INSERT OR REPLACE INTO offline_lessons
        (lesson_id, lesson_data, audio_path, image_path, doc_path, downloaded_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        lessonData.id,
        JSON.stringify(lessonData),
        lessonData.audio_path || null,
        lessonData.image_path || null,
        lessonData.doc_path || null,
        new Date().toISOString()
    );

    // Also save relational lesson and sentence records.
    await saveLessonToLocalTables(lessonData);
};

export const getDownloadedLessonIds = async () => {
    const db = await getDatabase();

    const rows = await db.getAllAsync(
        'SELECT lesson_id FROM offline_lessons'
    );

    return rows.map(row => row.lesson_id);
};

export const getOfflineLesson = async (lessonId) => {
    const db = await getDatabase();

    const row = await db.getFirstAsync(
        'SELECT lesson_data FROM offline_lessons WHERE lesson_id = ?',
        lessonId
    );

    return row ? JSON.parse(row.lesson_data) : null;
};
