// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages build: `GITHUB_PAGES=true` (set by .github/workflows/deploy.yml).
// `VITE_BASE_PATH` is the repository sub-path, e.g. "/my-repo/". Defaults to "/".
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  tanstackStart: isGitHubPages
    ? // On GitHub Pages there is no server runtime — emit a client-rendered SPA
      // shell that every route falls back to (uses the default server entry so
      // the shell can be prerendered).
      { spa: { enabled: true } }
    : {
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR
        // error wrapper). nitro/vite builds from this
        server: { entry: "server" },
      },
  // Static output only for the Pages build; Lovable/preview builds keep their default target.
  ...(isGitHubPages ? { nitro: { preset: "static" as const } } : {}),
  vite: isGitHubPages ? { base: basePath } : {},
});
