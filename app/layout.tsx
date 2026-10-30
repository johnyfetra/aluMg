import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";

const geist = Figtree({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"], display: "swap" });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], display: "swap" });

export const metadata: Metadata = {
  title: "AluMg, devis menuiserie aluminium",
  description: "Créez des devis professionnels pour la menuiserie aluminium et les volets roulants.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#141916" },
  ],
};

// Applique le thème avant le premier rendu pour éviter un flash clair/sombre.
const themeInit = `try{var t=localStorage.getItem('alumg.theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geist.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
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
