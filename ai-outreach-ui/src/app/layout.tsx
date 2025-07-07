import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ai reachout",
  description:
    "AIReachout is a tool that scouts for potential clients across different industries in a specific area. It collects details like emails, websites, and social profiles of businesses or enterprises, then sends them personalized cold emails and social media messages automatically.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explorer", label: "Explorer" },
  { href: "/composer", label: "Composer" },
  { href: "/schedule", label: "Schedule" },
  { href: "/crm", label: "CRM" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="../../public/Gemini_Generated_Image_wj8coxwj8coxwj8c.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[#FFE6A7]`}>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-3xl px-4 pt-4">
            {/* Minimal Nav */}
            <nav className="flex items-center justify-center mb-2">
              <div className="flex gap-2 bg-[#FFF6DC] rounded-full px-3 py-1 shadow-sm border border-[#f0e6d6]">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1 rounded-full font-medium text-[#2D2A32] hover:bg-[#f0cfcf] transition text-sm"
                    prefetch={false}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
        {children}
          </div>
        </div>
      </body>
    </html>
  );
}
