# Personal Buddy Desktop App

Electron + React + TypeScript desktop app foundation with Redux Toolkit Query for API integration and shared CSS tokens for consistent design.

## Commands

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run typecheck
npm.cmd run lint
```

Use `npm.cmd` on Windows if PowerShell blocks the `npm.ps1` shim.

## Environment

Create a local `.env` file when you have a backend:

```bash
VITE_API_BASE_URL=https://your-api-url.com
```

RTK Query reads this value in `src/renderer/services/api.ts`.

## Folder Structure

```text
src/
  main/                 Electron main process
  preload/              Safe IPC bridge exposed to the renderer
  shared/               Types/constants shared by Electron and React
  renderer/
    app/                App shell, Redux store, typed hooks
    components/
      common/           Reusable UI components
      layout/           Layout components
    features/           Feature modules and pages
    services/           RTK Query APIs and service clients
    styles/             Shared design system CSS
```

## Common CSS Variables

Design tokens live in `src/renderer/styles/tokens.css`.

- `--color-*`: app background, surfaces, active nav state, text, borders, brand blue, status colors, avatar, and preview accent colors.
- `--font-*`: font family, type scale, line heights, and weights.
- `--space-*`: spacing scale used for padding, gaps, and layout rhythm.
- `--radius-*`: shared border radius values for buttons, cards, and panels.
- `--shadow-*`: elevation styles for reusable components.
- `--sidebar-width`, `--meeting-panel-width`, `--header-height`, `--content-max-width`: dashboard layout sizing.
- `--control-height`: common height for search fields and meeting inputs.
- `--transition-base`: consistent animation timing.

Add new variables there first, then consume them from `base.css`, `layout.css`, `components.css`, and feature/page styles.
