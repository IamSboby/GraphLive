package com.graphlive.android;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.javascriptengine.JavaScriptSandbox;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NativePersistenceTest {
    @Test public void replicaSurvivesClosingDatabaseAndRejectsStaleAcknowledgement() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String name = "graphlive-verification-" + java.util.UUID.randomUUID() + ".db";
        try {
            JSONObject data = new JSONObject().put("key", "test").put("account", "synthetic").put("version", 1)
                .put("pending", true).put("local", new JSONObject().put("person", "Offline test").put("portrait", "embedded-photo").put("banner", "embedded-banner").put("position", new JSONObject().put("x", 12).put("y", 34)));
            char[] photo = new char[3 * 1024 * 1024];
            java.util.Arrays.fill(photo, 'A');
            data.getJSONObject("local").put("largePhoto", new String(photo));
            try (ReplicaDb db = new ReplicaDb(context, name)) { assertTrue(db.cas("test", null, data)); }
            try (ReplicaDb reopened = new ReplicaDb(context, name)) {
                assertEquals("embedded-photo", reopened.get("test").getJSONObject("local").getString("portrait"));
                assertTrue(reopened.get("test").getBoolean("pending"));
                assertEquals(photo.length, reopened.get("test").getJSONObject("local").getString("largePhoto").length());
                assertEquals(1, reopened.list("synthetic").length());
                JSONObject updated = new JSONObject(data.toString()).put("version", 2);
                assertTrue(reopened.cas("test", 1L, updated));
                assertFalse(reopened.cas("test", 1L, null));
                assertEquals(2, reopened.get("test").getInt("version"));
                JSONObject journal = new JSONObject().put("id", "edit").put("scope", "synthetic").put("version", "first");
                reopened.journalPut(journal);
                reopened.journalPut(new JSONObject(journal.toString()).put("version", "second"));
                reopened.journalRemove(journal);
                assertEquals("second", reopened.journalList("synthetic").getJSONObject(0).getString("version"));
            }
        } finally { context.deleteDatabase(name); }
    }
    @Test public void packagedSharedEngineStartsWithoutAnActivity() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Device must support the background JavaScript engine", JavaScriptSandbox.isSupported());
        try (var sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context).get(30, TimeUnit.SECONDS); var js = sandbox.createIsolate()) {
            String code;
            try (var input = context.getAssets().open("graphlive-sync.js"); var bytes = new java.io.ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int count;
                while ((count=input.read(buffer)) != -1) bytes.write(buffer,0,count);
                code = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            }
            js.evaluateJavaScriptAsync("globalThis.graphliveUuidPool=[];" + code + "; 'started'").get(30, TimeUnit.SECONDS);
            String request = js.evaluateJavaScriptAsync("JSON.stringify(graphliveRequests.splice(0))").get(10, TimeUnit.SECONDS);
            var requests = new org.json.JSONArray(request);
            assertEquals("session", requests.getJSONObject(0).getString("method"));
            js.evaluateJavaScriptAsync("graphliveDeliver(" + requests.getJSONObject(0).getInt("id") + ", {account:'',hasFileAccess:false}, null); 'delivered'").get(10, TimeUnit.SECONDS);
            assertEquals("true", js.evaluateJavaScriptAsync("String(graphliveDone)").get(10, TimeUnit.SECONDS));
        }
    }
}
