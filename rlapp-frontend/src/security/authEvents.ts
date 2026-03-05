export const AUTH_INVALID_EVENT = "rlapp:auth-invalid";
export const AUTH_CHANGED_EVENT = "rlapp:auth-changed";

export type AuthInvalidReason =
  | "unauthorized"
  | "forbidden"
  | "expired"
  | "missing";

export type AuthInvalidDetail = {
  reason: AuthInvalidReason;
  status?: number;
  path?: string;
};

export function dispatchAuthInvalid(detail: AuthInvalidDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AuthInvalidDetail>(AUTH_INVALID_EVENT, { detail }),
  );
}

export function dispatchAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}
