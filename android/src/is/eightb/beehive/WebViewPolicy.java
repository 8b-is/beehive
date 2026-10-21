package is.eightb.beehive;

import java.net.URI;
import java.net.URISyntaxException;

/** Pure policy shared by the Android callbacks and the host regression test. */
final class WebViewPolicy {
    static final String LOCAL_PAGE = "https://beehive.vaked.dev/";

    static boolean canServeAsset(String url, String method, boolean mainFrame) {
        return mainFrame && "GET".equals(method) && LOCAL_PAGE.equals(url);
    }

    static boolean canOpenExternally(String url, boolean mainFrame, boolean userGesture) {
        if (!mainFrame || !userGesture || url == null) return false;
        try {
            URI uri = new URI(url);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private WebViewPolicy() {}
}
