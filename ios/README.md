# Synapedia iOS App

Native iOS wrapper for [synapedia.com](https://synapedia.com) — a scientific knowledge platform for psychoactive substances (German).

## Overview

Phase 1 delivers a **WKWebView wrapper** built with SwiftUI that provides a native-feeling shell around the existing Next.js website. It includes:

- **SwiftUI App** targeting iOS 16+
- **WKWebView** with back/forward swipe gestures
- **Offline detection** with a branded retry screen
- **Loading progress bar** (linear, cyan accent)
- **Deep link support** (`synapedia://` custom scheme + Universal Links)
- **External link handling** (opens Safari for non-Synapedia URLs)
- **Admin path blocking** (`/admin` routes are not accessible in the app)
- **Native share sheet** (`UIActivityViewController` wrapped for SwiftUI)
- **Custom User-Agent** (`SynapediaApp/1.0` suffix for server-side detection)

## Requirements

| Tool    | Minimum Version |
|---------|----------------|
| Xcode   | 15.0+          |
| iOS SDK | 16.0+          |
| macOS   | Ventura 13.5+  |
| Swift   | 5.9+           |

## Getting Started

### 1. Open the Project

```bash
open ios/Synapedia.xcodeproj
```

### 2. Configure Signing

1. In Xcode, select the **Synapedia** target.
2. Go to **Signing & Capabilities**.
3. Select your **Team** (Apple Developer account).
4. Xcode will automatically manage provisioning profiles.

### 3. Run on Simulator

1. Select an iPhone simulator (e.g. iPhone 15 Pro).
2. Press **⌘R** to build and run.

### 4. Run on Device

1. Connect your iPhone via USB.
2. Select the device in the scheme selector.
3. Press **⌘R** — Xcode will install the app on your device.

## Project Structure

```
ios/
├── Synapedia.xcodeproj/
│   └── project.pbxproj         # Xcode project file
└── Synapedia/
    ├── SynapediaApp.swift      # @main entry point
    ├── ContentView.swift       # Root view (WebView + overlays)
    ├── WebView.swift           # WKWebView ↔ SwiftUI bridge
    ├── WebViewModel.swift      # Observable state (loading, offline, URL)
    ├── OfflineView.swift       # "No internet" screen
    ├── LoadingView.swift       # Splash / loading screen
    ├── ShareSheet.swift        # UIActivityViewController wrapper
    ├── Assets.xcassets/        # App icon, accent color
    ├── Info.plist              # App configuration & URL schemes
    ├── Synapedia.entitlements  # Associated domains (Universal Links)
    └── Preview Content/        # SwiftUI preview assets
```

## Configuration

### Bundle Identifier

`com.synapedia.app` — change this in the Xcode target settings if needed.

### Deep Links

**Custom URL Scheme:**
```
synapedia://articles/psilocybin
synapedia://brain
synapedia://interactions
```

**Universal Links (requires server-side setup):**

Host an `apple-app-site-association` file at `https://synapedia.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.synapedia.app",
        "paths": ["/articles/*", "/brain", "/interactions", "/compare", "/glossary/*"]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

### Blocked Paths

The `/admin` path is blocked in `WebViewModel.swift`. Edit the `blockedPaths` array to customize:

```swift
static let blockedPaths: [String] = ["/admin"]
```

## App Store Submission Checklist

- [ ] **App Icon**: Add a 1024×1024 PNG to `Assets.xcassets/AppIcon.appiconset/`
- [ ] **Bundle ID**: Register `com.synapedia.app` in Apple Developer portal
- [ ] **Signing**: Configure automatic or manual code signing
- [ ] **Privacy Policy**: Add a URL in App Store Connect (required)
- [ ] **App Description**: Prepare German + English descriptions
- [ ] **Screenshots**: Capture on iPhone 6.7" and 5.5" simulators
- [ ] **Review Guidelines**: Ensure compliance with [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — especially section 4.2 (minimum functionality for WebView apps: add value beyond Safari)
- [ ] **`ITSAppUsesNonExemptEncryption`**: Already set to `false` in Info.plist
- [ ] **Test on physical device** before submission
- [ ] **Archive & Upload**: Product → Archive → Distribute App → App Store Connect

## Phase 2 Roadmap (Android)

Future work to add Android support:

- [ ] Android project setup (Kotlin + Jetpack Compose or WebView Activity)
- [ ] Shared configuration (base URL, blocked paths)
- [ ] Deep link handling via Android App Links
- [ ] Play Store submission

## Phase 2+ Native Features

Hooks are in place for future native enhancements:

- [ ] **Push Notifications** (APNs + server integration)
- [ ] **Biometric Authentication** (Face ID / Touch ID)
- [ ] **Share Sheet** integration (already implemented, wire to web content)
- [ ] **Haptic Feedback** on key interactions
- [ ] **App Clips** for quick substance lookups
- [ ] **Widgets** (WidgetKit) for quick access
