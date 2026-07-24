import type { Metadata } from "next";
import { DM_Serif_Display, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/app/providers/AuthProvider";
import "./globals.css";

// DM Serif Display is not variable — weight must be explicit.
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// One family for both mono text and the wordmark/card titles (used bold).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "screener-agent",
  description: "First-round job interviews, conducted by an AI over voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
