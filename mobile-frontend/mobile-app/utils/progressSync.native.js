
import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const dbPromise = SQLite.openDatabaseAsync('langue_progress.db');

export async function initProgressSync() {
    const db = await dbPromise;

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pending_progress_events (
            event_id TEXT PRIMARY KEY NOT NULL,
            lesson_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    `);
}

export async function saveProgressEvent({
    lessonId,
    eventType,
    payload = {},
}) {
    const db = await dbPromise;

    const event = {
        event_id: randomUUID(),
        lesson_id: lessonId,
        event_type: eventType,
        occurred_at: new Date().toISOString(),
        payload,
        created_at: new Date().toISOString(),
    };

    await db.runAsync(
        `INSERT INTO pending_progress_events
        (event_id, lesson_id, event_type, occurred_at, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        event.event_id,
        event.lesson_id,
        event.event_type,
        event.occurred_at,
        JSON.stringify(event.payload),
        event.created_at
    );

    return event;
}

export async function getPendingProgressEvents() {
    const db = await dbPromise;

    const rows = await db.getAllAsync(`
        SELECT *
        FROM pending_progress_events
        ORDER BY created_at ASC
    `);

    return rows.map(row => ({
        event_id: row.event_id,
        lesson_id: row.lesson_id,
        event_type: row.event_type,
        occurred_at: row.occurred_at,
        payload: JSON.parse(row.payload),
    }));
}

export async function deleteProgressEvent(eventId) {
    const db = await dbPromise;

    await db.runAsync(
        'DELETE FROM pending_progress_events WHERE event_id = ?',
        eventId
    );
}

export async function testLocalProgressQueue() {
    const event = await saveProgressEvent({
        lessonId: 75,
        eventType: 'test',
        payload: { test: true },
    });

    const pendingEvents = await getPendingProgressEvents();

    const found = pendingEvents.find(
        item => item.event_id === event.event_id
    );

    console.log('TEST EVENT SAVED:', !!found);
    console.log('TEST EVENT DATA:', found);

    await deleteProgressEvent(event.event_id);

    console.log('TEST EVENT CLEANED UP');
}

export async function exportProgressDatabase() {
    const db = await dbPromise;

    // Export the actual SQLite database into memory.
    const bytes = await db.serializeAsync();

    // Convert the database bytes to Base64.
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    const base64 = btoa(binary);
    const fileUri =
        `${FileSystem.cacheDirectory}langue_progress.db`;

    // Write a real SQLite database file.
    await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Share the database file with your PC or file-transfer app.
    await Sharing.shareAsync(fileUri, {
        mimeType: 'application/x-sqlite3',
        dialogTitle: 'Export Langue SQLite Database',
    });
}
export async function checkProgressDatabase() {
    const db = await dbPromise;

    const tables = await db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
    );

    console.log('Progress database opened successfully');
    console.log('Database tables:', tables);
}

const markLessonCompleted = async () => {
    if (!currentLesson) return;

    // Prevent duplicate completion events during this lesson visit.
    if (completedLessonRef.current === currentLesson) return;

    completedLessonRef.current = currentLesson;

    // Offline: save completion to SQLite.
    if (offlineMode) {
        try {
            await saveProgressEvent({
                lessonId: currentLesson,
                eventType: 'completed',
                payload: {},
            });

            setLessonCompleted(true);
        } catch (err) {
            completedLessonRef.current = null;
            console.error('Failed to save offline completion:', err);
        }

        return;
    }

    // Online: keep the existing Django request.
    if (!token) {
        completedLessonRef.current = null;
        return;
    }

    try {
        const response = await fetch(
            `http://${serverIP}:8000/api/user-progress/`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: currentLesson,
                    current_lesson_index: rows.length - 1,
                    is_completed: true,
                }),
            }
        );

        if (response.ok) {
            setLessonCompleted(true);
        } else {
            completedLessonRef.current = null;
            console.error(
                'Failed to mark lesson completed:',
                await response.text()
            );
        }
    } catch (err) {
        completedLessonRef.current = null;
        console.error('Failed to complete lesson:', err);
    }
};

const resetLessonCompletion = async () => {
    if (!currentLesson || resettingCompletion) return;

    setResettingCompletion(true);

    try {
        if (offlineMode) {
            await saveProgressEvent({
                lessonId: currentLesson,
                eventType: 'reset',
                payload: {},
            });
        } else {
            if (!token) return;

            const response = await fetch(
                `http://${serverIP}:8000/api/user-progress/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        lesson_id: currentLesson,
                        current_lesson_index: 0,
                        is_completed: false,
                    }),
                }
            );

            if (!response.ok) {
                console.error(
                    'Failed to reset lesson completion:',
                    await response.text()
                );
                return;
            }
        }

        setLessonCompleted(false);
        completedLessonRef.current = null;

        indexRef.current = 0;
        setIndex(0);

        if (rows.length > 0) {
            setStartMs(rows[0][3]);
            setEndMs(rows[0][4]);
        }
    } catch (err) {
        console.error('Failed to reset lesson completion:', err);
    } finally {
        setResettingCompletion(false);
    }
};

const updateLessonProgress = async (newIndex) => {
    if (!currentLesson) return;

    // Offline: queue the new lesson position in SQLite.
    if (offlineMode) {
        try {
            await saveProgressEvent({
                lessonId: currentLesson,
                eventType: 'position',
                payload: {
                    current_lesson_index: newIndex,
                },
            });

            console.log('OFFLINE PROGRESS SAVED:', {
                lesson: currentLesson,
                index: newIndex,
            });
        } catch (err) {
            console.error('Failed to save offline progress:', err);
        }

        return;
    }

    // Online: keep the existing Django request.
    if (!token) return;

    try {
        const response = await fetch(
            `http://${serverIP}:8000/api/user-progress/`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: currentLesson,
                    current_lesson_index: newIndex,
                }),
            }
        );

        const data = await response.json();

        console.log(
            'PROGRESS SAVE:',
            'lesson:', currentLesson,
            'index:', newIndex,
            'status:', response.status,
            'response:', data
        );

        if (!response.ok) {
            console.error('PROGRESS SAVE FAILED:', response.status, data);
        }
    } catch (err) {
        console.error('Failed to update lesson progress:', err);
    }
};