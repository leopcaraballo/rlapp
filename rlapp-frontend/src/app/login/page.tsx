"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { env } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/security/auth";
import { getDefaultRoute } from "@/security/routeAccess";

import styles from "./page.module.css";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "patient", label: "Paciente" },
  { value: "reception", label: "Recepcion" },
  { value: "cashier", label: "Caja" },
  { value: "doctor", label: "Medico" },
  { value: "admin", label: "Administrador" },
];

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { signIn } = useAuth();
  const [role, setRole] = useState<UserRole>("patient");
  const [ttl, setTtl] = useState(120);

  const next = useMemo(() => search?.get("next"), [search]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ttlMinutes = Number.isFinite(ttl) && ttl > 0 ? ttl : 120;
    signIn(role, ttlMinutes);
    const fallback = getDefaultRoute(role, env.DEFAULT_QUEUE_ID);
    router.replace(next ? decodeURIComponent(next) : fallback);
  }

  return (
    <main className={styles.loginRoot}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>Acceso al sistema</h1>
        <p className={styles.subtitle}>
          Seleccione el rol operativo para continuar.
        </p>

        <label className={styles.label} htmlFor="role">
          Rol
        </label>
        <select
          id="role"
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className={styles.label} htmlFor="ttl">
          Tiempo de sesion (minutos)
        </label>
        <input
          id="ttl"
          type="number"
          min={5}
          max={720}
          className={styles.input}
          value={ttl}
          onChange={(e) => setTtl(Number(e.target.value))}
        />

        <button type="submit" className={styles.submit}>
          Ingresar
        </button>
      </form>
    </main>
  );
}
