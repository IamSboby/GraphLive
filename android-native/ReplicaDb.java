package com.graphlive.android;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;

/** App-private durable storage shared by the UI plugin and WorkManager. */
final class ReplicaDb extends SQLiteOpenHelper {
    ReplicaDb(Context context) { this(context, "graphlive.db"); }
    ReplicaDb(Context context, String name) { super(context, name, null, 1); }
    @Override public void onConfigure(SQLiteDatabase db) { db.execSQL("PRAGMA synchronous=FULL"); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE replicas (id TEXT PRIMARY KEY, account TEXT NOT NULL, version INTEGER NOT NULL, body TEXT NOT NULL)");
        db.execSQL("CREATE TABLE journal (id TEXT PRIMARY KEY, scope TEXT NOT NULL, version TEXT NOT NULL, body TEXT NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { throw new IllegalStateException("unsupportedMigration"); }
    JSONObject get(String id) throws Exception {
        return readBody("replicas", id);
    }
    // SQLiteStatement avoids CursorWindow's per-row size limit for embedded photos.
    private JSONObject readBody(String table, String id) throws Exception {
        if (!table.equals("replicas") && !table.equals("journal")) throw new IllegalArgumentException("invalidData");
        try (var query = getReadableDatabase().compileStatement("SELECT body FROM " + table + " WHERE id=?")) {
            query.bindString(1, id);
            try { return new JSONObject(query.simpleQueryForString()); }
            catch (android.database.sqlite.SQLiteDoneException missing) { return null; }
        }
    }
    JSONArray list(String account) throws Exception {
        JSONArray result = new JSONArray();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT id FROM replicas WHERE account=?", new String[]{account})) {
            while (c.moveToNext()) { JSONObject value = get(c.getString(0)); if (value != null) result.put(value); }
        }
        return result;
    }
    boolean cas(String id, Long expected, JSONObject value) throws Exception {
        SQLiteDatabase db = getWritableDatabase(); db.beginTransaction();
        try {
            JSONObject before = get(id);
            if (expected == null ? before != null : before == null || before.getLong("version") != expected) return false;
            if (value == null) db.delete("replicas", "id=?", new String[]{id});
            else {
                if (!id.equals(value.getString("key"))) throw new IllegalArgumentException("invalidData");
                ContentValues row = new ContentValues(); row.put("id", id); row.put("account", value.getString("account"));
                row.put("version", value.getLong("version")); row.put("body", value.toString());
                if (db.insertWithOnConflict("replicas", null, row, SQLiteDatabase.CONFLICT_REPLACE) < 0) throw new Exception("localSaveFailed");
            }
            db.setTransactionSuccessful(); return true;
        } finally { db.endTransaction(); }
    }
    JSONArray journalList(String scope) throws Exception {
        JSONArray result = new JSONArray();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT id FROM journal WHERE scope=?", new String[]{scope})) {
            while (c.moveToNext()) { JSONObject value = readBody("journal", c.getString(0)); if (value != null) result.put(value); }
        }
        return result;
    }
    void journalPut(JSONObject value) throws Exception {
        ContentValues row = new ContentValues(); row.put("id", value.getString("id")); row.put("scope", value.getString("scope"));
        row.put("version", value.getString("version")); row.put("body", value.toString());
        if (getWritableDatabase().insertWithOnConflict("journal", null, row, SQLiteDatabase.CONFLICT_REPLACE) < 0) throw new Exception("localSaveFailed");
    }
    void journalRemove(JSONObject value) throws Exception {
        getWritableDatabase().delete("journal", "id=? AND version=?", new String[]{value.getString("id"), value.getString("version")});
    }
}

