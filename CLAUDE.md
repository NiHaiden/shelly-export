# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests (vitest)
pnpm lint         # Run ESLint
pnpm check        # Format and lint fix (prettier --write . && eslint --fix)
```

## Architecture

This is a TanStack Start application with React 19, TypeScript, and shadcn/ui (base-mira style).

**Stack:**
- TanStack Start (SSR framework) with TanStack Router for file-based routing
- Vite + Nitro for builds and server
- Tailwind CSS v4 with CSS variables for theming
- shadcn/ui components (Base UI React primitives, not Radix)

**Key Paths:**
- `src/routes/` - File-based routes (TanStack Router auto-generates `routeTree.gen.ts`)
- `src/routes/__root.tsx` - Root layout with HTML shell and devtools
- `src/components/ui/` - shadcn/ui components
- `src/lib/utils.ts` - `cn()` utility for className merging
- `src/styles.css` - Global styles and CSS variables (light/dark themes)

**Path Aliases:**
- `@/*` maps to `./src/*`

**Adding shadcn Components:**
```bash
pnpm dlx shadcn@latest add <component>
```
Components use Base UI React (not Radix) per `components.json` config.
