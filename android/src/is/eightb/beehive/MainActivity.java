package is.eightb.beehive;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        if (w != null) {
            w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            w.setStatusBarColor(Color.parseColor("#07060D"));
            w.setNavigationBarColor(Color.parseColor("#07060D"));
        }

        WebView.setWebContentsDebuggingEnabled(false);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#07060D"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setBlockNetworkLoads(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new LocalOnlyClient());
        webView.addJavascriptInterface(new AndroidBeeHiveBridge(this), "AndroidBeeHiveBridge");

        setContentView(webView);
        // Preserve the existing storage origin, but never fetch this origin remotely.
        webView.loadUrl(WebViewPolicy.LOCAL_PAGE);
    }

    private WebResourceResponse blockedResponse(String message) {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                java.util.Collections.singletonMap("Cache-Control", "no-store"),
                new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8)));
    }

    private final class LocalOnlyClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!WebViewPolicy.canServeAsset(request.getUrl().toString(),
                    request.getMethod(), request.isForMainFrame())) {
                return blockedResponse("Only the packaged BeeHive page is available here.");
            }
            try {
                InputStream asset = getAssets().open("index.html");
                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; "
                        + "style-src 'unsafe-inline'; img-src data:; media-src blob:; "
                        + "connect-src 'none'; frame-src 'none'; object-src 'none'; "
                        + "base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
                headers.put("Cache-Control", "no-store");
                headers.put("X-Content-Type-Options", "nosniff");
                return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, asset);
            } catch (IOException e) {
                return blockedResponse("Packaged BeeHive page unavailable. No remote fallback was loaded.");
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (WebViewPolicy.canOpenExternally(url, request.isForMainFrame(), request.hasGesture())) {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                try {
                    startActivity(intent);
                } catch (ActivityNotFoundException | SecurityException ignored) {
                    // Missing handlers do not justify loading external content with the bridge.
                }
            }
            return true; // Every navigation stays out of the bridge-enabled WebView.
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return true; // No main-frame/user-gesture evidence in this legacy callback.
        }
    }

    public class AndroidBeeHiveBridge {
        private final Context ctx;

        public AndroidBeeHiveBridge(Context c) {
            this.ctx = c;
        }

        @JavascriptInterface
        public String getVersion() {
            return "BeeHive v1.0.0 · <~~0o0 kompress-super-ultra {<3,<3,<3}+1 (Android SDK " + Build.VERSION.SDK_INT + ")";
        }

        @JavascriptInterface
        public String scanRadiosJson() {
            JSONArray arr = new JSONArray();
            try {
                BluetoothManager bm = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
                BluetoothAdapter adapter = bm != null ? bm.getAdapter() : BluetoothAdapter.getDefaultAdapter();
                if (adapter != null && adapter.isEnabled()) {
                    Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                    if (bonded != null) {
                        for (BluetoothDevice d : bonded) {
                            JSONObject o = new JSONObject();
                            o.put("transport", "Bluetooth");
                            o.put("id", d.getAddress());
                            o.put("name", d.getName());
                            arr.put(o);
                        }
                    }
                }
                WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    List<ScanResult> res = wm.getScanResults();
                    if (res != null) {
                        for (int i = 0; i < Math.min(8, res.size()); i++) {
                            ScanResult r = res.get(i);
                            JSONObject o = new JSONObject();
                            o.put("transport", "FindMy/WiFi");
                            o.put("id", r.BSSID);
                            o.put("name", r.SSID);
                            o.put("rssi", r.level);
                            arr.put(o);
                        }
                    }
                }
                AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    JSONObject o = new JSONObject();
                    o.put("transport", "AirPlay/A2DP");
                    o.put("bluetoothA2dpOn", am.isBluetoothA2dpOn());
                    arr.put(o);
                }
            } catch (Throwable ignored) {}
            return arr.toString();
        }
    }
}
