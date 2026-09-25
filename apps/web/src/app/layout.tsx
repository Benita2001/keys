import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/feedback";
import { StoreProvider } from "@/state/store";
import { WalletProvider } from "@/components/wallet/provider";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cresco — Money skills today", template: "%s · Cresco" },
  description:
    "A fun, safe way for 10–15 year olds to learn about money, companies and investing, with practice first and family-set limits.",
  applicationName: "Cresco",
  appleWebApp: { capable: true, title: "Cresco", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fff9f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunitoSans.variable} antialiased`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[70] rounded-[12px] bg-blue px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <StoreProvider>
          <WalletProvider>
            <ToastProvider>{children}</ToastProvider>
          </WalletProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
