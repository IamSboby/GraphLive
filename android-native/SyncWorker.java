package com.graphlive.android;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import androidx.javascriptengine.JavaScriptSandbox;
import androidx.javascriptengine.JavaScriptIsolate;
import androidx.javascriptengine.IsolateStartupParameters;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.concurrent.TimeUnit;
import java.nio.charset.StandardCharsets;

/** Runs the same TypeScript sync, merge and Drive adapter as the web, without an Activity. */
public class SyncWorker extends Worker {
    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters parameters) { super(context, parameters); }
    private static Constraints constraints() { return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).setRequiresStorageNotLow(true).build(); }
    static void enqueue(Context context) {
        WorkManager.getInstance(context).enqueueUniqueWork("graphlive-sync", ExistingWorkPolicy.KEEP,
            new OneTimeWorkRequest.Builder(SyncWorker.class).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build());
    }
    static void schedule(Context context) {
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("graphlive-periodic", ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(SyncWorker.class, 15, TimeUnit.MINUTES).setConstraints(constraints()).build());
        enqueue(context);
    }
    private static String evaluate(JavaScriptIsolate js, String source) throws Exception {
        return js.evaluateJavaScriptAsync(source).get(45, TimeUnit.SECONDS);
    }
    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        var prefs = context.getSharedPreferences("drive", 0);
        String account = prefs.getString("account", "");
        if (account.isEmpty()) return Result.success();
        if (!JavaScriptSandbox.isSupported()) return Result.success(); // Foreground engine remains available.
        try (ReplicaDb db = new ReplicaDb(context);
             JavaScriptSandbox sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context).get(30, TimeUnit.SECONDS)) {
            if (!sandbox.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_EVALUATE_WITHOUT_TRANSACTION_LIMIT)) return Result.success();
            IsolateStartupParameters parameters = new IsolateStartupParameters();
            // A replica may contain base, local and remote copies with embedded photos.
            parameters.setMaxEvaluationReturnSizeBytes(64 * 1024 * 1024);
            try (JavaScriptIsolate js = sandbox.createIsolate(parameters)) {
                JSONArray ids = new JSONArray(); for (int i=0; i<1024; i++) ids.put(java.util.UUID.randomUUID().toString());
                evaluate(js, "globalThis.graphliveUuidPool=" + ids + "; 'ready'");
                String script;
                try (var input = context.getAssets().open("graphlive-sync.js"); var bytes = new java.io.ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int count;
                    while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
                    script = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                }
                evaluate(js, script + "\n; 'started'");
                long deadline = System.currentTimeMillis() + 8 * 60 * 1000;
                String token = null;
                while (!isStopped() && System.currentTimeMillis() < deadline) {
                    JSONObject state = new JSONObject(evaluate(js, "JSON.stringify({done:globalThis.graphliveDone,retry:globalThis.graphliveRetry,requests:globalThis.graphliveRequests.splice(0)})"));
                    if (state.getBoolean("done")) return state.getBoolean("retry") ? Result.retry() : Result.success();
                    JSONArray requests = state.getJSONArray("requests");
                    for (int i=0; i<requests.length(); i++) {
                        JSONObject request = requests.getJSONObject(i), options = request.getJSONObject("options");
                        JSONObject result = new JSONObject(); String error = null;
                        try {
                            switch (request.getString("method")) {
                                case "session": result.put("account", account).put("hasFileAccess", prefs.getBoolean("shared", false)); break;
                                case "replicaGet": result.put("value", db.get(options.getString("key"))); break;
                                case "replicaList":
                                    if (!account.equals(options.getString("account"))) throw new Exception("driveAccountChanged");
                                    result.put("values", db.list(account)); break;
                                case "replicaSet": result.put("changed", db.cas(options.getString("key"), options.isNull("expected") ? null : options.getLong("expected"), options.optJSONObject("value"))); break;
                                case "journalList": result.put("values", db.journalList(options.getString("scope"))); break;
                                case "journalRemove": db.journalRemove(options.getJSONObject("value")); break;
                                case "driveRequest":
                                    if (!account.equals(options.getString("account"))) throw new Exception("driveAccountChanged");
                                    if (token == null) token = DriveAccess.token(context, account);
                                    result = DriveAccess.http(token, options.getString("url"), options.optString("method", "GET"), options.optJSONObject("headers"), options.has("body") ? options.getString("body") : null);
                                    if (result.getInt("status") == 401) token = null;
                                    break;
                                default: throw new Exception("invalidOperation");
                            }
                        } catch (android.database.sqlite.SQLiteFullException e) { error = "offlineStorageFull"; }
                        catch (Exception e) { String message=e.getMessage(); error=message != null && message.matches("[a-zA-Z]{1,50}") ? message : "storageError"; }
                        evaluate(js, "globalThis.graphliveDeliver(" + request.getLong("id") + "," + result + "," + (error == null ? "null" : JSONObject.quote(error)) + "); 'delivered'");
                    }
                    if (requests.length() == 0) Thread.sleep(20);
                }
            }
        } catch (Exception e) { return Result.retry(); }
        return Result.retry();
    }
}
