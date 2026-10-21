// Web does not use the native SQLite database.
// Offline database operations are handled by localDatabase.native.js on native platforms.

export async function initLocalDatabase() {
    return null;
}

export async function getLocalDatabase() {
    return null;
}

export async function saveLessonToLocalTables() {
    return null;
}