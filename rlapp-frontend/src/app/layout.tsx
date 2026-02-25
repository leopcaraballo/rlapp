import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AlertProvider } from "@/context/AlertContext";
import { DependencyProvider } from "@/context/DependencyContext";
import { AlertProvider } from "@/context/AlertContext";

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
        <DependencyProvider>
          <AlertProvider>{children}</AlertProvider>
        </DependencyProvider>
      </body>
    </html>
  );
}
