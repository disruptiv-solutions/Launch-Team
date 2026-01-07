import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LAUNCH | AI Team Control",
  description: "Advanced hierarchical multi-agent coordination system.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark antialiased">
      <body className={`${inter.className} dark:selection:bg-indigo-900 dark:selection:text-indigo-100`}>
        {children}
      </body>
    </html>
  );
}
