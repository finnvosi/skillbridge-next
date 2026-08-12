import type { Metadata } from "next";
import { Urbanist, Poppins } from "next/font/google";
import "./globals.css";
import { CursorGlow } from "@/components/layout/cursor-glow";
import { PreloaderMount } from "@/components/layout/preloader-mount";

// Brand type system: Urbanist for headings (display), Poppins for body.
// Self-hosted at build time via next/font (no FOUT, works offline).
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillBridge — Bridge Your Skills to Real Opportunities",
  description:
    "Connect students with employers through meaningful projects, jobs, and career opportunities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full scroll-smooth ${urbanist.variable} ${poppins.variable}`}
    >
      <body className="relative min-h-full flex flex-col h-full bg-white text-foreground font-sans antialiased">
        {/* Three-layer ambient background: white base + cursor aura + frosted veil */}
        <CursorGlow />
        <PreloaderMount />
        {children}
      </body>
    </html>
  );
}
