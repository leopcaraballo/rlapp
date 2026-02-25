"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./Navbar.module.css";

const DEFAULT_QUEUE_ID = process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01";

/** Rutas donde el navbar NO debe aparecer */
const HIDDEN_ROUTES = ["/"];

/** Listado de vínculos de navegación global */
const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/reception", label: "Recepción" },
  { href: "/cashier", label: "Caja" },
  { href: "/medical", label: "Médico" },
  { href: "/consulting-rooms", label: "Consultorios" },
  { href: `/waiting-room/${DEFAULT_QUEUE_ID}`, label: "Sala de espera" },
  { href: "/dashboard", label: "Dashboard" },
];

/**
 * Barra de navegación global de la SPA.
 * Se oculta automáticamente en las rutas definidas en HIDDEN_ROUTES.
 */
export default function Navbar(): React.ReactNode {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <nav className={styles.topNav}>
      <Link className={styles.brand} href="/">
        Turnos Disponibles
      </Link>

      {NAV_LINKS.map(({ href, label }) => {
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
    </nav>
  );
}
