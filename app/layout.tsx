import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { AuthInitializer } from "@/components/auth/auth-initializer";

export const metadata: Metadata = {
  title: "Global Threat Map | Intelligence Platform",
  description: "Real-time global situational awareness platform for security events, geopolitical developments, and threat indicators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistMono.className} antialiased min-h-screen`}>
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  );
}
