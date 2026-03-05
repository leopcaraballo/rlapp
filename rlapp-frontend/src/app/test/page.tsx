import styles from "@/styles/page.module.css";

export default function TestPage() {
  return (
    <main className={styles.dashboardContainer}>
      <h1 className={styles.title}>Test page</h1>
      <p className={styles.audioHint}>Si ves esto, el enrutamiento funciona.</p>
    </main>
  );
}
