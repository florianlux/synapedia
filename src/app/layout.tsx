import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import "./globals.css";

const BASE_URL = "https://synapedia.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Synapedia – Wissenschaftliche Aufklärungsplattform",
  description:
    "Eine evidenzbasierte Wissensdatenbank über psychoaktive Substanzen mit Fokus auf Pharmakologie, Risiken und Interaktionen.",
  openGraph: {
    title: "Synapedia – Wissenschaftliche Aufklärungsplattform",
    description:
      "Eine evidenzbasierte Wissensdatenbank über psychoaktive Substanzen mit Fokus auf Pharmakologie, Risiken und Interaktionen.",
    type: "website",
    url: BASE_URL,
    siteName: "Synapedia",
    locale: "de_DE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synapedia – Wissenschaftliche Aufklärungsplattform",
    description:
      "Eine evidenzbasierte Wissensdatenbank über psychoaktive Substanzen mit Fokus auf Pharmakologie, Risiken und Interaktionen.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Synapedia",
            url: BASE_URL,
            description:
              "Eine evidenzbasierte Wissensdatenbank über psychoaktive Substanzen mit Fokus auf Pharmakologie, Risiken und Interaktionen.",
            inLanguage: "de",
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Startseite",
                item: BASE_URL,
              },
            ],
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
