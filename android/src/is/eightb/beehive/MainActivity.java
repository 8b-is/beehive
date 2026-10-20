package is.eightb.beehive;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Context;
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
import java.io.InputStream;
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

        WebView.setWebContentsDebuggingEnabled(true);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#07060D"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new AndroidBeeHiveBridge(this), "AndroidBeeHiveBridge");

        setContentView(webView);
        try {
            InputStream is = getAssets().open("index.html");
            byte[] buf = new byte[is.available()];
            int read = 0;
            while (read < buf.length) {
                int r = is.read(buf, read, buf.length - read);
                if (r <= 0) break;
                read += r;
            }
            is.close();
            String html = new String(buf, 0, read, StandardCharsets.UTF_8);
            webView.loadDataWithBaseURL("https://beehive.vaked.dev/", html, "text/html", "UTF-8", "https://beehive.vaked.dev/");
        } catch (Throwable e) {
            webView.loadUrl("file:///android_asset/index.html");
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
