// GitHub Pages serves static files only and has no rewrite rules for a
// client-side router: a direct link or reload for anything but "/" 404s.
// Duplicating the built index.html as 404.html is the standard workaround -
// GitHub Pages serves it for any unmatched path, and React Router then
// takes over client-side once it loads.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

copyFileSync(join(distDir, "index.html"), join(distDir, "404.html"));
