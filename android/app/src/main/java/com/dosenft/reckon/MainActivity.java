package com.dosenft.reckon;

import android.app.Activity;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Reckon's whole app: one WebView showing the web files packed inside the app (assets/www).
 * They're served under a private https address that only this app answers, so nothing touches the
 * network (the app has no INTERNET permission) and Reckon's saved settings stay put between updates.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/index.html#/job";
    static final int BG = 0xFF1B1E22;

    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        // Keep the pad clear of the status bar, the gesture bar, the camera cut-out and the keyboard.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsets.CONSUMED;
        });

        web = new WebView(this);
        web.setBackgroundColor(BG);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // Reckon keeps its settings and tape in localStorage
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setSafeBrowsingEnabled(false);       // it would phone home, and there's nothing to check
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);                    // the keypad is laid out for 100%, like in the browser
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !HOST.equals(req.getUrl().getHost());   // never leave the app
            }
        });
        // The page asks for its offline helper (sw.js); the app doesn't need one, so it gets a plain "not here".
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest req) {
                return serve(req.getUrl());
            }
        });

        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if (saved == null || web.restoreState(saved) == null) web.loadUrl(START);
    }

    /** Answers the app's private address from the files inside the app; anything else gets nothing. */
    WebResourceResponse serve(Uri u) {
        if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return empty(403, "Forbidden");
        String p = u.getPath();
        if (p == null || p.isEmpty() || p.endsWith("/")) p = (p == null ? "/" : p) + "index.html";
        if (p.contains("..")) return empty(404, "Not Found");
        try {
            InputStream in = getAssets().open("www" + p);
            String type = mime(p);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-store");
            return new WebResourceResponse(type, type.startsWith("image/png") ? null : "utf-8", 200, "OK", h, in);
        } catch (IOException e) {
            return empty(404, "Not Found");
        }
    }

    static WebResourceResponse empty(int code, String why) {
        return new WebResourceResponse("text/plain", "utf-8", code, why, new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();    // Back steps through the faces, like in the browser
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
