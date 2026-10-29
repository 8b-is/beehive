#if canImport(WebKit)
import SwiftUI
import WebKit

@available(macOS 13.0, iOS 16.0, *)
struct BeeHiveWebUIView: View {
    var body: some View {
        BeeHiveWebView()
            .ignoresSafeArea()
    }
}

#if os(macOS)
@available(macOS 13.0, *)
private struct BeeHiveWebView: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView { makeWebView() }
    func updateNSView(_ webView: WKWebView, context: Context) {}
}
#else
@available(iOS 16.0, *)
private struct BeeHiveWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView { makeWebView() }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}
#endif

@available(macOS 13.0, iOS 16.0, *)
private func makeWebView() -> WKWebView {
    let configuration = WKWebViewConfiguration()
    configuration.defaultWebpagePreferences.allowsContentJavaScript = true
    #if os(macOS)
    let platform = "macos"
    #else
    let platform = "ios"
    #endif
    let bridge = WKUserScript(
        source: "window.BeeHiveHostBridge = { platform: '\(platform)' };",
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
    )
    configuration.userContentController.addUserScript(bridge)
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.allowsBackForwardNavigationGestures = true

    if let index = Bundle.main.url(forResource: "index", withExtension: "html") {
        webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    } else if let remote = URL(string: "https://beehive.vaked.dev/") {
        webView.load(URLRequest(url: remote))
    }
    return webView
}
#endif
