package is.eightb.beehive;

public final class WebViewPolicyTest {
    private static int checks;
    private static void check(boolean value, String label) {
        checks++;
        if (!value) throw new AssertionError(label);
    }
    public static void main(String[] args) {
        String local = WebViewPolicy.LOCAL_PAGE;
        check(WebViewPolicy.canServeAsset(local, "GET", true), "packaged main document");
        check(!WebViewPolicy.canServeAsset(local, "GET", false), "no same-origin iframe");
        check(!WebViewPolicy.canServeAsset(local, "POST", true), "no post");
        for (String url : new String[]{local + "index.html", local + "?remote=1", local + "../", "http://beehive.vaked.dev/", "https://beehive.vaked.dev.evil.test/", "https://beehive.vaked.dev@evil.test/", "file:///android_asset/index.html", "content://test", "data:text/html,test", "javascript:alert(1)", "blob:https://beehive.vaked.dev/example", "about:blank", null}) {
            check(!WebViewPolicy.canServeAsset(url, "GET", true), "no remote/fallback resource: " + url);
        }
        String external = "https://example.com/article#section";
        check(WebViewPolicy.canOpenExternally(external, true, true), "user HTTPS link");
        check(!WebViewPolicy.canOpenExternally(external, false, true), "no iframe handoff");
        check(!WebViewPolicy.canOpenExternally(external, true, false), "no automatic handoff");
        for (String url : new String[]{"http://example.com/", "javascript:alert(1)", "file:///etc/test", "content://test", "intent://test", "findmy://items", "https://user@example.com/", "https://example.com:8443/", "https://", "https://example.com\\@evil.test/", "not a url", null}) {
            check(!WebViewPolicy.canOpenExternally(url, true, true), "blocked handoff: " + url);
        }
        System.out.println(checks + " navigation policy checks passed");
    }
}
