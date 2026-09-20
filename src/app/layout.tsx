import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "FOX AI SOCIAL — AI Social Media Marketing OS",
    template: "%s · FOX AI SOCIAL",
  },
  description:
    "FOX AI SOCIAL is an AI-powered social media marketing operating system: multi-tenant workspaces, AI agents, approvals, scheduling, publishing, analytics and Google Sheets sync.",
  applicationName: "FOX AI SOCIAL",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070B18",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = (store.get("fox-theme")?.value ?? "dark") as "dark" | "light" | "system";
  const locale = (store.get("fox-locale")?.value ?? "en") as Locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} data-theme={theme === "system" ? "dark" : theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Cairo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider initialTheme={theme} initialLocale={locale}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
