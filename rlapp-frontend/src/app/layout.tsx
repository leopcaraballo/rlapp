import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Navbar from "@/components/Navbar/Navbar";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider } from "@/context/AuthContext";
import { DependencyProvider } from "@/context/DependencyContext";
import RouteGuard from "@/security/RouteGuard";

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
          <AuthProvider>
            <AlertProvider>
              <RouteGuard>
                <Navbar />
                {children}
              </RouteGuard>
            </AlertProvider>
          </AuthProvider>
        </DependencyProvider>
      </body>
    </html>
  );
}
