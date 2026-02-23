import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pin It",
  description: "Map to pin where you have traveled",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-white text-zinc-900 antialiased`}>
        <div className="flex h-screen flex-col overflow-hidden bg-white">
          <Navigation />
          <main className="flex-1 min-h-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
