import Foundation
import Combine
import WebKit

/// Observable object that tracks WebView state (loading, offline, URL, errors).
final class WebViewModel: ObservableObject {

    // MARK: - Configuration

    static let baseURL = URL(string: "https://synapedia.com")!

    /// Paths that must not be accessible inside the app (e.g. admin panel).
    static let blockedPaths: [String] = ["/admin"]

    // MARK: - Published state

    @Published var isLoading = true
    @Published var isOffline = false
    @Published var currentURL: URL?
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var pageTitle: String = ""
    @Published var estimatedProgress: Double = 0

    // MARK: - Actions (forwarded to WKWebView via WebView)

    var goBackAction: (() -> Void)?
    var goForwardAction: (() -> Void)?
    var reloadAction: (() -> Void)?

    // MARK: - Helpers

    func goBack()    { goBackAction?() }
    func goForward() { goForwardAction?() }
    func reload()    { reloadAction?() }

    /// Returns `true` when the given URL points to a blocked path.
    func isBlocked(_ url: URL) -> Bool {
        Self.blockedPaths.contains { url.path.hasPrefix($0) }
    }
}
