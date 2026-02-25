import SwiftUI

/// A branded splash / loading view shown while the first page load is in progress.
struct LoadingView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("Synapedia")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(.primary)

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.cyan)
            }
        }
    }
}

#Preview {
    LoadingView()
}
