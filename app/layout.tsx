import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { AuthProvider } from "@/lib/auth";
import { ScrollToTop } from "@/components/ScrollToTop";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata = {
  title: "SearchBiz.co.za - Business Directory",
  description: "Modern business listings website for South Africa.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-[#f8f9fa] overflow-x-hidden w-full`}>
        <ScrollToTop />
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

