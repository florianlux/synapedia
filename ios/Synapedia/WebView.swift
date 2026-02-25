import SwiftUI
import WebKit

/// A `UIViewRepresentable` wrapper around `WKWebView`.
struct WebView: UIViewRepresentable {
    @ObservedObject var viewModel: WebViewModel
    let url: URL

    // MARK: - UIViewRepresentable

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true

        // Custom User-Agent suffix so the web app can detect the native shell.
        if let defaultUA = webView.value(forKey: "userAgent") as? String {
            webView.customUserAgent = "\(defaultUA) SynapediaApp/1.0"
        }

        // Wire up view-model actions.
        viewModel.goBackAction    = { [weak webView] in webView?.goBack() }
        viewModel.goForwardAction = { [weak webView] in webView?.goForward() }
        viewModel.reloadAction    = { [weak webView] in webView?.reload() }

        // KVO for progress & navigation state.
        context.coordinator.observe(webView)

        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Only reload when the base URL changes (shouldn't happen often).
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(viewModel: viewModel)
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, WKNavigationDelegate {
        let viewModel: WebViewModel
        private var observations: [NSKeyValueObservation] = []

        init(viewModel: WebViewModel) {
            self.viewModel = viewModel
        }

        /// Adds KVO observers to the web view.
        func observe(_ webView: WKWebView) {
            observations = [
                webView.observe(\.isLoading) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.isLoading = wv.isLoading }
                },
                webView.observe(\.canGoBack) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.canGoBack = wv.canGoBack }
                },
                webView.observe(\.canGoForward) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.canGoForward = wv.canGoForward }
                },
                webView.observe(\.estimatedProgress) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.estimatedProgress = wv.estimatedProgress }
                },
                webView.observe(\.title) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.pageTitle = wv.title ?? "" }
                },
                webView.observe(\.url) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.viewModel.currentURL = wv.url }
                },
            ]
        }

        // MARK: WKNavigationDelegate

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Block admin paths.
            if viewModel.isBlocked(url) {
                decisionHandler(.cancel)
                return
            }

            // Open external links in Safari.
            if let host = url.host,
               !host.hasSuffix("synapedia.com"),
               navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async { self.viewModel.isOffline = false }
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            handlePossibleOffline(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handlePossibleOffline(error)
        }

        private func handlePossibleOffline(_ error: Error) {
            let code = (error as NSError).code
            // NSURLErrorNotConnectedToInternet = -1009
            // NSURLErrorTimedOut = -1001
            // NSURLErrorCannotFindHost = -1003
            let offlineCodes: Set<Int> = [-1001, -1003, -1009]
            if offlineCodes.contains(code) {
                DispatchQueue.main.async { self.viewModel.isOffline = true }
            }
        }
    }
}
