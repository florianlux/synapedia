import SwiftUI

/// Root view: shows the WebView, a loading overlay, or the offline screen.
struct ContentView: View {
    @StateObject private var viewModel = WebViewModel()

    var body: some View {
        ZStack {
            // WebView always mounted so it keeps state.
            WebView(viewModel: viewModel, url: WebViewModel.baseURL)
                .ignoresSafeArea(edges: .bottom)

            // Progress bar at the top.
            if viewModel.isLoading {
                VStack {
                    ProgressView(value: viewModel.estimatedProgress)
                        .progressViewStyle(.linear)
                        .tint(.cyan)
                    Spacer()
                }
            }

            // Offline overlay.
            if viewModel.isOffline {
                OfflineView {
                    viewModel.reload()
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel.isOffline)
        .onOpenURL { url in
            // Handle deep links (e.g. synapedia://articles/psilocybin)
            handleDeepLink(url)
        }
    }

    // MARK: - Deep Links

    private func handleDeepLink(_ url: URL) {
        // Supports both custom scheme (synapedia://) and universal links (https://synapedia.com/...).
        let path: String
        if url.scheme == "synapedia" {
            // synapedia://articles/psilocybin  →  /articles/psilocybin
            path = "/\(url.host ?? "")\(url.path)"
        } else {
            path = url.path
        }

        guard !path.isEmpty,
              let webURL = URL(string: "https://synapedia.com\(path)") else { return }

        // Re-use the existing reload mechanism by setting the URL directly.
        viewModel.reloadAction = nil // clear old closure
        viewModel.currentURL = webURL
        // The WebView will pick this up via updateUIView or we can trigger reload.
    }
}

#Preview {
    ContentView()
}
