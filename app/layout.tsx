import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { AuthProvider } from "@/lib/auth";
import { ScrollToTop } from "@/components/ScrollToTop";



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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-[#f8f9fa]">
        <ScrollToTop />
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

