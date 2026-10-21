
import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('langue_progress.db');

export async function initLocalDatabase() {
    const db = await dbPromise;

    await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS languages (
            id INTEGER PRIMARY KEY,
            lang_name TEXT NOT NULL UNIQUE,
            yt_dlp_lang TEXT,
            tesseract_langcode TEXT
        );

        CREATE TABLE IF NOT EXISTS reading_level_scales (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL UNIQUE,
            description TEXT,
            measurement_type TEXT
        );

        CREATE TABLE IF NOT EXISTS reading_levels (
            id INTEGER PRIMARY KEY,
            scale_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            value REAL NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (scale_id)
                REFERENCES reading_level_scales(id),
            UNIQUE (scale_id, name)
        );

        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            doc_file TEXT,
            media_file TEXT,
            media_folder TEXT,
            image TEXT,
            user_id INTEGER,
            url TEXT,
            uuid TEXT UNIQUE,
            native_language_id INTEGER,
            target_language_id INTEGER,
            lesson_private INTEGER NOT NULL DEFAULT 0,
            audioUploaded INTEGER NOT NULL DEFAULT 0,
            fileUploaded INTEGER NOT NULL DEFAULT 0,
            videoGenerated INTEGER NOT NULL DEFAULT 0,
            audioGenerated INTEGER NOT NULL DEFAULT 0,
            sentencesReordered INTEGER NOT NULL DEFAULT 0,
            urlReference TEXT,
            videoFormat INTEGER NOT NULL DEFAULT 0,
            reading_level_id INTEGER,
            created_at TEXT,
            FOREIGN KEY (native_language_id) REFERENCES languages(id),
            FOREIGN KEY (target_language_id) REFERENCES languages(id),
            FOREIGN KEY (reading_level_id) REFERENCES reading_levels(id)
        );

        CREATE TABLE IF NOT EXISTS sentences (
            id INTEGER PRIMARY KEY,
            sentence TEXT NOT NULL,
            start_ms INTEGER,
            end_ms INTEGER,
            translated_sentence TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            lesson_language_id INTEGER,
            translate_language_id INTEGER,
            lesson_id INTEGER NOT NULL,
            FOREIGN KEY (lesson_id)
                REFERENCES lessons(id) ON DELETE CASCADE,
            FOREIGN KEY (lesson_language_id) REFERENCES languages(id),
            FOREIGN KEY (translate_language_id) REFERENCES languages(id)
        );

        CREATE INDEX IF NOT EXISTS idx_sentences_lesson_position
            ON sentences(lesson_id, position);

        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            creation_date TEXT
        );

        CREATE TABLE IF NOT EXISTS lesson_tags (
            lesson_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (lesson_id, tag_id),
            FOREIGN KEY (lesson_id)
                REFERENCES lessons(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id)
                REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            native_language_id INTEGER,
            target_language_id INTEGER,
            offline_mode INTEGER NOT NULL DEFAULT 0,
            notifications INTEGER NOT NULL DEFAULT 1,
            dictionary_name TEXT,
            user_dictionary_id INTEGER,
            user_set_volume REAL NOT NULL DEFAULT 1.0,
            user_set_speed REAL NOT NULL DEFAULT 1.0,
            repeat_audio INTEGER NOT NULL DEFAULT 0,
            repeat_audio_all INTEGER NOT NULL DEFAULT 0,
            shuffle_audio INTEGER NOT NULL DEFAULT 0,
            showVideoCaptions INTEGER NOT NULL DEFAULT 0,
            showVideoView INTEGER NOT NULL DEFAULT 0,
            continuousPlay INTEGER NOT NULL DEFAULT 0,
            isScraperEnabled INTEGER NOT NULL DEFAULT 0,
            textToTextModel_id INTEGER,
            speechToTextModel_id INTEGER,
            textToSpeechModel_id INTEGER,
            imageToTextModel_id INTEGER,
            FOREIGN KEY (native_language_id) REFERENCES languages(id),
            FOREIGN KEY (target_language_id) REFERENCES languages(id)
        );

        CREATE TABLE IF NOT EXISTS user_lessons_progress (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            lesson_id INTEGER,
            current_lesson_index INTEGER NOT NULL DEFAULT 0,
            is_completed INTEGER NOT NULL DEFAULT 0,
            num_of_times_read INTEGER NOT NULL DEFAULT 0,
            total_time_read REAL NOT NULL DEFAULT 0,
            date_created TEXT,
            last_viewed TEXT,
            UNIQUE (user_id, lesson_id),
            FOREIGN KEY (lesson_id)
                REFERENCES lessons(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_language_lesson_indices (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            lesson_progress_id INTEGER,
            lesson_language_id INTEGER NOT NULL,
            UNIQUE (user_id, lesson_language_id),
            FOREIGN KEY (lesson_progress_id)
                REFERENCES user_lessons_progress(id),
            FOREIGN KEY (lesson_language_id) REFERENCES languages(id)
        );

        CREATE TABLE IF NOT EXISTS offline_lessons (
            lesson_id INTEGER PRIMARY KEY,
            lesson_data TEXT NOT NULL,
            audio_path TEXT,
            image_path TEXT,
            doc_path TEXT,
            downloaded_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pending_progress_events (
            event_id TEXT PRIMARY KEY NOT NULL,
            lesson_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    `);

    console.log('Local Langue database initialized');
    return db;
}

export async function getLocalDatabase() {
    return dbPromise;
}


export async function saveLessonToLocalTables(lessonData) {

    const db = await dbPromise;

    const getId = (value) => {
        if (value && typeof value === 'object') {
            return value.id ?? null;
        }

        return value ?? null;
    };

    const lessonId = Number(lessonData.id);

    if (!Number.isInteger(lessonId)) {
        throw new Error('Cannot save lesson: invalid lesson ID');
    }

    // Only use foreign keys that already exist locally.
    const getExistingLanguageId = async (value) => {
        const id = getId(value);
        if (id == null) return null;

        const row = await db.getFirstAsync(
            'SELECT id FROM languages WHERE id = ?',
            Number(id)
        );

        return row ? row.id : null;
    };

    const nativeLanguageId = await getExistingLanguageId(
        lessonData.native_language_id ?? lessonData.native_language
    );

    const targetLanguageId = await getExistingLanguageId(
        lessonData.target_language_id ?? lessonData.target_language
    );

    const readingLevelValue =
        lessonData.reading_level_id ?? lessonData.reading_level;

    const readingLevelId = getId(readingLevelValue);

    let existingReadingLevelId = null;

    if (readingLevelId != null) {
        const row = await db.getFirstAsync(
            'SELECT id FROM reading_levels WHERE id = ?',
            Number(readingLevelId)
        );

        if (row) existingReadingLevelId = row.id;
    }

    await db.runAsync(
        `INSERT INTO lessons (
            id, title, doc_file, media_file, media_folder, image,
            user_id, url, uuid, native_language_id,
            target_language_id, lesson_private, audioUploaded,
            fileUploaded, videoGenerated, audioGenerated,
            sentencesReordered, urlReference, videoFormat,
            reading_level_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            doc_file = excluded.doc_file,
            media_file = excluded.media_file,
            media_folder = excluded.media_folder,
            image = excluded.image,
            user_id = excluded.user_id,
            url = excluded.url,
            uuid = excluded.uuid,
            native_language_id = excluded.native_language_id,
            target_language_id = excluded.target_language_id,
            lesson_private = excluded.lesson_private,
            audioUploaded = excluded.audioUploaded,
            fileUploaded = excluded.fileUploaded,
            videoGenerated = excluded.videoGenerated,
            audioGenerated = excluded.audioGenerated,
            sentencesReordered = excluded.sentencesReordered,
            urlReference = excluded.urlReference,
            videoFormat = excluded.videoFormat,
            reading_level_id = excluded.reading_level_id,
            created_at = excluded.created_at`,
        lessonId,
        lessonData.title || 'Untitled lesson',
        lessonData.doc_file ?? null,
        lessonData.media_file ?? null,
        lessonData.media_folder ?? null,
        lessonData.image ?? null,
        getId(lessonData.user_id ?? lessonData.user),
        lessonData.url ?? null,
        lessonData.uuid ?? null,
        nativeLanguageId,
        targetLanguageId,
        lessonData.lesson_private ? 1 : 0,
        lessonData.audioUploaded ? 1 : 0,
        lessonData.fileUploaded ? 1 : 0,
        lessonData.videoGenerated ? 1 : 0,
        lessonData.audioGenerated ? 1 : 0,
        lessonData.sentencesReordered ? 1 : 0,
        lessonData.urlReference ?? null,
        lessonData.videoFormat ? 1 : 0,
        existingReadingLevelId,
        lessonData.created_at ?? null
    );

    // Save sentences when they are included in the downloaded lesson.
    if (Array.isArray(lessonData.sentences)) {
        await db.runAsync(
            'DELETE FROM sentences WHERE lesson_id = ?',
            lessonId
        );

        for (const sentence of lessonData.sentences) {
            const sentenceId = Number(sentence.id);

            if (!Number.isInteger(sentenceId)) continue;

            await db.runAsync(
                `INSERT INTO sentences (
                    id, sentence, start_ms, end_ms,
                    translated_sentence, position,
                    lesson_language_id, translate_language_id, lesson_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                sentenceId,
                sentence.sentence ?? '',
                sentence.start_ms ?? null,
                sentence.end_ms ?? null,
                sentence.translated_sentence ?? null,
                sentence.position ?? 0,
                await getExistingLanguageId(
                    sentence.lesson_language_id ?? sentence.lesson_language
                ),
                await getExistingLanguageId(
                    sentence.translate_language_id ?? sentence.translate_language
                ),
                lessonId
            );
        }
    }

    console.log('LESSON SAVED TO LOCAL TABLES:', lessonId);
}

