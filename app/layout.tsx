import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMI RDC et K-Majuscule - Examens blancs",
  description: "Plateforme bilingue pour examens blancs PMP, CAPM et gestion de projet.",
  icons: {
    icon: "/logo-pmi-drc.png",
    shortcut: "/logo-pmi-drc.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
