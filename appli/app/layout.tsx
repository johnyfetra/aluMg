import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./app.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";

const sans = Figtree({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = { title: "AluMg Devis" };
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1722" },
  ],
};

// Thème posé avant le premier rendu (même clé que le site), pour éviter un flash.
const themeInit = `try{var t=localStorage.getItem('alumg.theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full">
        <I18nProvider>
          <ConfirmProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConfirmProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
