import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madara FF | 5 Player Bot",
  description: "Private Madara FF player and squad control panel.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}