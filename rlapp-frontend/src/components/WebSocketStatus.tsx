"use client";

import styles from "./WebSocketStatus.module.css";

/**
 * WebSocketStatus - Real-time connection status indicator badge
 *
 * Displays the current WebSocket connection state using a color-coded badge.
 * - 🟢 Green: Connected
 * - 🟡 Yellow: Connecting
 * - 🔴 Red: Disconnected/Error
 *
 * @param status - Connection status: 'connected' | 'connecting' | 'disconnected'
 * @param variant - Badge variant: 'inline' (compact) | 'block' (full-width)
 *
 * @example
 * ```tsx
 * <WebSocketStatus status={connected ? 'connected' : 'disconnected'} variant="inline" />
 * ```
 */
export type ConnectionStatus = "connected" | "connecting" | "disconnected";
type BadgeVariant = "inline" | "block";

interface WebSocketStatusProps {
  status: ConnectionStatus;
  variant?: BadgeVariant;
}

const StatusConfig = {
  connected: {
    icon: "🟢",
    label: "Conectado",
    className: styles.statusConnected,
  },
  connecting: {
    icon: "🟡",
    label: "Conectando...",
    className: styles.statusConnecting,
  },
  disconnected: {
    icon: "🔴",
    label: "Desconectado",
    className: styles.statusDisconnected,
  },
};

export default function WebSocketStatus({
  status,
  variant = "inline",
}: WebSocketStatusProps) {
  const config = StatusConfig[status];
  const isBlock = variant === "block";

  return (
    <div
      className={`${styles.badge} ${config.className} ${
        isBlock ? styles.blockVariant : styles.inlineVariant
      }`}
      data-testid={`websocket-status-${status}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.label}>{config.label}</span>
    </div>
  );
}
