import type { Metadata } from "next";
import { Playfair_Display, Alex_Brush, Montserrat } from "next/font/google";
import "./globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "./providers";
import AppShell from "./AppShell";
import Script from "next/script";
import { Toaster } from 'sonner';

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const alexBrush = Alex_Brush({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-alex-brush",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});


export const metadata: Metadata = {
  title: {
    template: '%s | Aura Boutique',
    default: 'Aura Boutique | Moda Femenina y Exclusiva en Perú',
  },
  description: "Boutique de moda femenina exclusiva en Perú. Encuentra las últimas tendencias en vestidos, blusas y accesorios con envíos a todo el país. ✨ Aura Boutique - Tu estilo, tu esencia.",
  keywords: ["boutique femenina", "moda mujer", "boutique online peru", "vestidos de fiesta lima", "ropa de mujer exclusiva", "aura boutique peru", "moda chic lima", "comprar ropa online peru", "tendencias de moda femenina"],
  openGraph: {
    title: 'Aura Boutique | Moda Femenina y Exclusiva en Perú',
    description: 'Encuentra vestidos exclusivos y lo último en moda femenina con envíos a todo el Perú. 🚛✨',
    url: 'https://auraboutique.me',
    siteName: 'Aura Boutique',
    locale: 'es_PE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aura Boutique | Moda Femenina y Exclusiva en Perú',
    description: 'Boutique online de moda femenina en Perú. ¡Descubre tu próximo look ahora! ✨',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${alexBrush.variable} ${montserrat.variable}`}>

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