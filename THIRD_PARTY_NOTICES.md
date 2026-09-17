# Third-party notices

## flag-icons

SVG country flags: https://github.com/lipis/flag-icons

License: MIT, copyright Panayiotis Lipiridis. The complete upstream license is included in `public/flags/LICENSE.txt`. The exact dependency version is pinned in `package.json` and `package-lock.json`.

The 4:3 SVG files are vendored unchanged from `node_modules/flag-icons/flags/4x3`. `packages/ui/flags.ts` uses the package's ISO country list and a neutral fallback for unsupported legacy codes. No third-party requests are required to display flags.
