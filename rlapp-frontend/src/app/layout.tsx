import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { DependencyProvider } from "@/context/DependencyContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Turnos Pantalla",
  description: "Sistema de Turnos IA_P1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DependencyProvider>{children}</DependencyProvider>
      </body>
    </html>
  );
}
