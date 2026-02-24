# CSS Modules Conventions — Frontend

## File Naming

- One `page.module.css` per page (co-located with the page component)
- Component-level styles: `<ComponentName>.module.css`

## Naming Convention

Use **camelCase** for CSS class names:

```css
/* Correct */
.dashboardContainer {
}
.appointmentCard {
}
.statusBadge {
}

/* Incorrect */
.dashboard-container {
}
.appointment_card {
}
```

## Usage in Components

```tsx
import styles from "./page.module.css";

export default function Page() {
  return <div className={styles.dashboardContainer}>...</div>;
}
```

## Forbidden

- No `@import` of external CSS frameworks (Tailwind, Bootstrap)
- No global CSS beyond `globals.css` (Next.js default)
- No inline `style={{}}` for layout — use CSS Modules
- No CSS-in-JS libraries (styled-components, emotion)

## Color Palette

Use CSS custom properties defined in `globals.css` for consistency:

```css
:root {
  --color-primary: #0070f3;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
  --color-bg: #f5f5f5;
}
```
