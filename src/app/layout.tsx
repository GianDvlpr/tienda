import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Montserrat } from "next/font/google";
import "./globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "./providers";
import AppShell from "./AppShell";
import Script from "next/script";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-great-vibes",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Aura Boutique",
  description: "Tienda online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} ${montserrat.variable}`}>
        <AntdRegistry>
          <Providers>
            <AppShell>{children}</AppShell>
            <Toaster 
              position="top-center" 
              richColors 
              toastOptions={{ 
                style: { width: 'fit-content', minWidth: '250px', margin: '0 auto' } 
              }} 
            />
          </Providers>
        </AntdRegistry>
        <Script src="https://checkout.culqi.com/js/v4" strategy="afterInteractive" />
      </body>
    </html>
  );
}