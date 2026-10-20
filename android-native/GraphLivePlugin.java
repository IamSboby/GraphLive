package com.graphlive.android;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import org.json.JSONObject;

@CapacitorPlugin(name = "GraphLive", requestCodes = {9021})
public class GraphLivePlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ExecutorService network = Executors.newFixedThreadPool(2);
    private ReplicaDb db;
    private PluginCall authorization;
    @Override public void load() { db = new ReplicaDb(getContext()); SyncWorker.schedule(getContext()); }
    interface Work { JSONObject run() throws Exception; }
    private void perform(PluginCall call, Work work) {
        performOn(io, call, work);
    }
    private void performOn(ExecutorService executor, PluginCall call, Work work) {
        executor.execute(() -> {
            try { call.resolve(JSObject.fromJSONObject(work.run())); }
            catch (android.database.sqlite.SQLiteFullException e) { call.reject("offlineStorageFull"); }
            catch (Exception e) {
                String reason = e.getMessage();
                // Never expose native exception details, HTTP bodies or credentials to the UI.
                call.reject(reason != null && reason.matches("[a-zA-Z]{1,50}") ? reason : "storageError");
            }
        });
    }
    @PluginMethod public void replicaGet(PluginCall c) { perform(c, () -> { JSONObject r = db.get(c.getString("key")); return new JSONObject().put("value", r == null ? JSONObject.NULL : r); }); }
    @PluginMethod public void replicaList(PluginCall c) { perform(c, () -> new JSONObject().put("values", db.list(c.getString("account")))); }
    @PluginMethod public void replicaSet(PluginCall c) { perform(c, () -> {
        JSONObject options = c.getData();
        Long expected = options.isNull("expected") ? null : options.getLong("expected");
        boolean changed = db.cas(c.getString("key"), expected, options.optJSONObject("value"));
        if (changed) SyncWorker.enqueue(getContext());
        return new JSONObject().put("changed", changed);
    }); }
    @PluginMethod public void journalList(PluginCall c) { perform(c, () -> new JSONObject().put("values", db.journalList(c.getString("scope")))); }
    @PluginMethod public void journalPut(PluginCall c) { perform(c, () -> { db.journalPut(c.getObject("value")); SyncWorker.enqueue(getContext()); return new JSONObject(); }); }
    @PluginMethod public void journalRemove(PluginCall c) { perform(c, () -> { db.journalRemove(c.getObject("value")); return new JSONObject(); }); }
    @PluginMethod public void session(PluginCall c) { perform(c, () -> {
        var prefs = getContext().getSharedPreferences("drive", 0);
        return new JSONObject().put("account", prefs.getString("account", "")).put("hasFileAccess", prefs.getBoolean("shared", false));
    }); }
    @PluginMethod public void authorize(PluginCall c) {
        if (authorization != null) { c.reject("driveBusy"); return; }
        authorization = c;
        Identity.getAuthorizationClient(getActivity()).authorize(DriveAccess.request(c.getBoolean("shared", false)))
            .addOnSuccessListener(grant -> {
                if (grant.hasResolution()) {
                    try { getActivity().startIntentSenderForResult(grant.getPendingIntent().getIntentSender(), 9021, null, 0, 0, 0); }
                    catch (Exception e) { authorization = null; c.reject("driveCancelled"); }
                } else finishAuthorization(grant);
            }).addOnFailureListener(e -> { authorization = null; c.reject("drivePermission"); });
    }
    @Override protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != 9021 || authorization == null) return;
        try { finishAuthorization(Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(data)); }
        catch (Exception e) { PluginCall call = authorization; authorization = null; call.reject("driveCancelled"); }
    }
    private void finishAuthorization(AuthorizationResult grant) {
        PluginCall c = authorization; authorization = null;
        if (c == null) return;
        performOn(network, c, () -> {
            if (grant.getAccessToken() == null || !grant.getGrantedScopes().contains(DriveAccess.APP)) throw new Exception("drivePermission");
            String account = DriveAccess.account(grant.getAccessToken());
            var prefs = getContext().getSharedPreferences("drive", 0);
            String previous = prefs.getString("account", "");
            if (!previous.isEmpty() && !previous.equals(account)) throw new Exception("driveAccountChanged");
            boolean shared = grant.getGrantedScopes().contains(DriveAccess.FILE);
            if (!prefs.edit().putString("account", account).putBoolean("shared", shared).commit()) throw new Exception("localSaveFailed");
            SyncWorker.enqueue(getContext());
            return new JSONObject().put("account", account).put("hasFileAccess", shared);
        });
    }
    @PluginMethod public void driveRequest(PluginCall c) { performOn(network, c, () -> {
        String expected = c.getString("account", "");
        if (expected.isEmpty() || !expected.equals(getContext().getSharedPreferences("drive", 0).getString("account", ""))) throw new Exception("driveAccountChanged");
        String token = DriveAccess.token(getContext(), expected);
        return DriveAccess.http(token, c.getString("url"), c.getString("method", "GET"), c.getObject("headers"), c.getString("body"));
    }); }
    @PluginMethod public void exportRecovery(PluginCall c) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.setType("application/json"); intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.putExtra(Intent.EXTRA_TITLE, "graphlive-offline-recovery.json");
        startActivityForResult(c, intent, "exportResult");
    }
    @ActivityCallback private void exportResult(PluginCall c, ActivityResult result) {
        if (c == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) { c.reject("exportCancelled"); return; }
        perform(c, () -> {
            JSONObject record = db.get(c.getString("key"));
            if (record == null) throw new Exception("offlineMissing");
            String scope = "drive:" + record.getString("account") + (record.getString("network").equals("default") ? "" : ":" + record.getString("network")) + ":" + record.getJSONObject("base").getString("ownerId");
            record.put("journal", db.journalList(scope));
            try (var output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (output == null) throw new Exception("localSaveFailed");
                output.write(record.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            return new JSONObject();
        });
    }}


