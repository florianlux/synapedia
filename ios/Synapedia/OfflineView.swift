import SwiftUI

/// Full-screen overlay shown when the device is offline.
struct OfflineView: View {
    let onRetry: () -> Void

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 56))
                    .foregroundStyle(.secondary)

                Text("Keine Internetverbindung")
                    .font(.title2.weight(.semibold))

                Text("Synapedia benötigt eine aktive Internetverbindung. Bitte überprüfe deine Netzwerkeinstellungen.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Button(action: onRetry) {
                    Label("Erneut versuchen", systemImage: "arrow.clockwise")
                        .font(.body.weight(.medium))
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(.cyan.opacity(0.15))
                        .foregroundStyle(.cyan)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

#Preview {
    OfflineView { }
}
