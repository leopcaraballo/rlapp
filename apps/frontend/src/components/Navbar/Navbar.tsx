"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { isPublicPath, isRouteAllowed } from "@/security/routeAccess";

import styles from "./Navbar.module.css";

const DEFAULT_QUEUE_ID = process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01";

/** Listado de vínculos de navegación global */
const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/reception", label: "Recepción" },
  { href: "/payment", label: "Caja" },
  { href: "/medical", label: "Médico" },
  { href: "/stations", label: "Consultorios" },
  { href: `/atencion/${DEFAULT_QUEUE_ID}`, label: "Sala de espera" },
  { href: "/dashboard", label: "Dashboard" },
];

/**
 * Barra de navegación global de la SPA.
 * Se oculta automáticamente en las rutas definidas en HIDDEN_ROUTES.
 */
export default function Navbar(): React.ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAuthenticated, signOut } = useAuth();

  const isHidden =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/monitor");

  if (isHidden || isPublicPath(pathname)) {
    return null;
  }

  if (!isAuthenticated || !role) {
    return null;
  }

  if (role === "patient") {
    return null;
  }

  const visibleLinks = NAV_LINKS.filter((link) =>
    isRouteAllowed(role, link.href),
  );

  return (
    <nav className={styles.topNav}>
      <Link className={styles.brand} href="/">
        Turnos Disponibles
      </Link>

      {visibleLinks.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ""}`}
          >
            {label}
          </Link>
        );
      })}

      <button
        type="button"
        className={styles.navLink}
        onClick={() => {
          signOut();
          router.replace("/login");
        }}
      >
        Cerrar sesion
      </button>
    </nav>
  );
}
