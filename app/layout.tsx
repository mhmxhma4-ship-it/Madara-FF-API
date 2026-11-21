import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madara FF API",
  description: "Private EU-focused Free Fire API gateway.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}