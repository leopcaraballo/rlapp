"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { env } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import {
  getDefaultRoute,
  isPublicPath,
  isRouteAllowed,
  LOGIN_PATH,
} from "@/security/routeAccess";

export default function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = useMemo(() => isPublicPath(pathname), [pathname]);

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      if (!isPublic) {
        const next = encodeURIComponent(pathname);
        router.replace(`${LOGIN_PATH}?next=${next}`);
      }
      return;
    }

    if (isPublic) {
      router.replace(getDefaultRoute(session.role, env.DEFAULT_QUEUE_ID));
      return;
    }

    const allowed = isRouteAllowed(session.role, pathname);
    if (!allowed) {
      console.warn(
        `Acceso bloqueado para rol ${session.role} en ruta ${pathname}`,
      );
      router.replace(getDefaultRoute(session.role, env.DEFAULT_QUEUE_ID));
    }
  }, [ready, session, pathname, isPublic, router]);

  if (!ready) return null;
  if (!session && !isPublic) return null;
  if (session && !isPublic && !isRouteAllowed(session.role, pathname))
    return null;

  return <>{children}</>;
}
