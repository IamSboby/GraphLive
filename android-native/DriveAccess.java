package com.graphlive.android;

import android.content.Context;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Tasks;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

final class DriveAccess {
    static final String APP = "https://www.googleapis.com/auth/drive.appdata";
    static final String FILE = "https://www.googleapis.com/auth/drive.file";
    static AuthorizationRequest request(boolean shared) {
        ArrayList<Scope> scopes = new ArrayList<>(); scopes.add(new Scope(APP)); if (shared) scopes.add(new Scope(FILE));
        return AuthorizationRequest.builder().setRequestedScopes(scopes).build();
    }
    static JSONObject http(String token, String url, String method, JSONObject headers, String body) throws Exception {
        if (!url.matches("https://www\\.googleapis\\.com/(?:upload/)?drive/v2/.*")) throw new Exception("invalidPath");
        HttpsURLConnection c = (HttpsURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setRequestMethod(method);
        c.setRequestProperty("Authorization", "Bearer " + token);
        if (headers != null) for (java.util.Iterator<String> it = headers.keys(); it.hasNext();) {
            String key = it.next();
            if (key.equalsIgnoreCase("Authorization") || key.equalsIgnoreCase("Host")) continue;
            c.setRequestProperty(key, headers.getString(key));
        }
        try {
            if (body != null) { c.setDoOutput(true); try (var out = c.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); } }
            int status = c.getResponseCode();
            var stream = status >= 400 ? c.getErrorStream() : c.getInputStream();
            String text = "";
            if (stream != null) try (stream) {
                java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[8192]; int size;
                while ((size = stream.read(buffer)) != -1) {
                    if (bytes.size() + size > 11000000) throw new Exception("tooLarge");
                    bytes.write(buffer, 0, size);
                }
                text = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            }
            return new JSONObject().put("status", status).put("body", text);
        } finally { c.disconnect(); }
    }
    static String account(String token) throws Exception {
        JSONObject response = http(token, "https://www.googleapis.com/drive/v2/about?fields=user(permissionId)", "GET", null, null);
        if (response.getInt("status") != 200) throw new Exception("driveExpired");
        return new JSONObject(response.getString("body")).getJSONObject("user").getString("permissionId");
    }
    static String token(Context context, String expected) throws Exception {
        boolean shared = context.getSharedPreferences("drive", 0).getBoolean("shared", false);
        AuthorizationResult grant = Tasks.await(Identity.getAuthorizationClient(context).authorize(request(shared)), 30, TimeUnit.SECONDS);
        if (grant.hasResolution() || grant.getAccessToken() == null) throw new Exception("driveExpired");
        if (!expected.equals(account(grant.getAccessToken()))) throw new Exception("driveAccountChanged");
        return grant.getAccessToken();
    }
}
