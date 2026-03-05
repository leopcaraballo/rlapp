import React from "react";
import styles from "./alert.module.css";

type Variant = "error" | "success" | "info";

interface AlertProps {
  message: string | null;
  variant?: Variant;
}

export default function Alert({ message, variant = "info" }: AlertProps) {
  if (!message) return null;
  return (
    <div role="alert" className={`${styles.alert} ${styles[variant]}`}>
      <span className={styles.message}>{message}</span>
    </div>
  );
}
