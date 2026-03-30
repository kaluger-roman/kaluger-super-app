# Research: Лендинг-страница репетитора

Дата: 2026-02-24

## Topic 1: Next.js 15 Static Export

**Decision**: Use `output: 'export'` in `next.config.ts` with App Router, `trailingSlash: true`, and `images.unoptimized: true`.

**Rationale**: Next.js 15 natively supports full static site generation via the `output: 'export'` config option. When `next build` runs, it produces an `out/` directory containing plain HTML/CSS/JS files that can be served by any static web server (Nginx in our case). The App Router is stable for static exports since v13.4 and works well with React Server Components -- they simply run at build time, similar to traditional SSG.

Key configuration (`next.config.ts`):

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',

  // Emit /index.html instead of .html files -- cleaner for Nginx
  trailingSlash: true,

  // Static export cannot use the default image optimization loader
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

Build command: `next build` produces the `out/` directory. No `next export` command needed (removed in v14).

Supported features in static export:
- Server Components (run at build time)
- Client Components (pre-rendered to HTML, hydrated on client)
- Route Handlers (GET only, rendered to static files)
- CSS Modules, Tailwind CSS, global CSS
- `<Link>` client-side navigation
- `generateStaticParams()` for dynamic routes

Unsupported features (require server runtime):
- Dynamic Routes without `generateStaticParams()`
- Server Actions
- Cookies / Headers / Rewrites / Redirects
- Incremental Static Regeneration (ISR)
- Image Optimization with default loader
- Draft Mode, Intercepting Routes
- Middleware

For a single-page landing with no dynamic routes, none of the unsupported features are relevant.

**Alternatives considered**:
- **Astro**: Excellent for static sites, but adds a new framework to the team's stack. Next.js keeps us in the React ecosystem consistent with the main frontend.
- **Vite + React (SPA)**: No SSG benefits (SEO, initial load speed). A landing page benefits from pre-rendered HTML.
- **Pages Router**: Still supported but App Router is the recommended path for new Next.js projects and has full static export support.

**Sources**:
- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports)
- [next.config.js output option](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [next.config.js trailingSlash](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash)

---

## Topic 2: Tailwind CSS 4 Setup with Next.js 15

**Decision**: Use Tailwind CSS v4 with `@tailwindcss/postcss` plugin. CSS-first configuration (no `tailwind.config.js`).

**Rationale**: Tailwind v4 (released January 2025) introduces a fundamentally different configuration model: CSS-first instead of JavaScript-first. There is no `tailwind.config.js` -- all customization happens directly in CSS using `@theme` directives. The PostCSS integration uses a dedicated `@tailwindcss/postcss` package (not the `tailwindcss` package directly as a PostCSS plugin).

Installation:

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

PostCSS configuration (`postcss.config.mjs`):

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

CSS entry point (`app/globals.css`):

```css
@import 'tailwindcss';

/* Custom theme tokens */
@theme {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --font-heading: 'Inter', sans-serif;
}
```

Key differences from Tailwind v3:
- Single `@import "tailwindcss"` replaces the three `@tailwind base/components/utilities` directives
- Configuration is in CSS (`@theme { }`) instead of `tailwind.config.js`
- Content detection is automatic -- no `content: ['./src/**/*.tsx']` array needed
- The PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss` itself
- Full builds are up to 5x faster, incremental builds 100x+ faster
- Output CSS is ~35% smaller than v3

For custom design tokens (colors, fonts, spacing), use the `@theme` directive in CSS. For custom utilities, use `@utility` directive. This aligns well with our static landing page needs.

**Alternatives considered**:
- **Tailwind v3**: Still works but is in maintenance mode. v4 offers better performance, smaller output, and is the actively developed version.
- **`@tailwindcss/vite`**: The Vite plugin is faster than PostCSS for Vite-based projects. However, Next.js uses its own build pipeline (Turbopack/webpack), so PostCSS is the correct integration path. Next.js does not support the Vite plugin.
- **CSS Modules / vanilla CSS**: More verbose, no utility-first workflow. Tailwind is ideal for rapid landing page development.

**Sources**:
- [Tailwind CSS v4 PostCSS Installation](https://tailwindcss.com/docs/installation/using-postcss)
- [Tailwind CSS v4.0 Release Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

---

## Topic 3: Scroll Animations

**Decision**: Custom React hook with Intersection Observer API + CSS transitions. No external animation library.

**Rationale**: For a static landing page with simple fade-in-on-scroll effects, the Intersection Observer API combined with CSS `opacity`/`transform` transitions is the lightest possible approach. It adds zero JavaScript library weight, leverages GPU-accelerated CSS properties, and runs observation logic off the main thread.

Implementation -- custom hook (`useInView`):

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export const useInView = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element); // animate once
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
};
```

Usage with Tailwind classes:

```tsx
const { ref, isInView } = useInView();

return (
  <div
    ref={ref}
    className={cn(
      'transition-all duration-700 ease-out',
      isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    )}
  >
    {children}
  </div>
);
```

CSS considerations:
- Animate only `opacity` and `transform` (GPU-composited, no layout thrashing)
- Use `will-change: transform, opacity` sparingly (only on animating elements)
- Respect `prefers-reduced-motion`: disable animations for users who prefer reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Note on CSS `animation-timeline: view()`: This pure-CSS approach to scroll-driven animations is supported in Chrome 115+ and Safari 26+, but NOT in Firefox as of February 2026. Given incomplete browser support, the Intersection Observer approach is more reliable.

**Alternatives considered**:
- **Framer Motion** (~40KB gzipped): Powerful but overkill for simple fade-in effects. Adds significant bundle size to a static landing page. Best for complex gesture-based interactions, spring physics, layout animations.
- **AOS (Animate On Scroll)** (~14KB): Lightweight library, but it's jQuery-era design. Adds a global initialization step and data attributes. The custom hook approach is cleaner in React.
- **GSAP ScrollTrigger** (~25KB): Industry-standard for complex timeline animations, but unnecessary for simple entrance effects.
- **CSS `animation-timeline: view()`**: Pure CSS, zero JS. Elegant but Firefox lacks support (February 2026). Could be adopted as a progressive enhancement in the future.
- **`react-intersection-observer`** package: Provides a `useInView` hook. Clean API, but for a single hook it's simpler to write our own (~15 lines) and avoid the dependency.

**Sources**:
- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN: CSS Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [Web Animation Performance Tier List](https://motion.dev/blog/web-animation-performance-tier-list)
- [How to fade in content as it scrolls into view](https://www.selbekk.io/blog/how-to-fade-in-content-as-it-scrolls-into-view)

---

## Topic 4: Social Media Icons

**Decision**: Inline SVG components for all icons. Use `react-icons` (Simple Icons set) for standard brands (VK, WhatsApp, Telegram). Custom SVG for Profi.ru and Max (VK messenger).

**Rationale**: For a static landing page, inline SVGs are optimal: zero network requests, perfect scaling, CSS-colorable via `currentColor`, and tree-shakeable when imported individually. The `react-icons` library includes the Simple Icons collection which covers most major brands.

Available from `react-icons/si`:
- `SiVk` -- VKontakte
- `SiTelegram` -- Telegram
- `SiWhatsapp` -- WhatsApp

NOT available in standard icon sets:
- **Profi.ru** -- Niche Russian tutoring marketplace. No icon in any standard set. Solution: create a custom SVG component from the official Profi.ru logo (available on Brandfetch). The logo is a distinctive "P" mark.
- **Max** (VK messenger, formerly ICQ) -- Rebranded in 2024-2025. The logo SVG is available on Wikimedia Commons and icons8. Solution: create a custom SVG component from the official logo.

Implementation approach:

```tsx
// Standard icons from react-icons
import { SiVk, SiTelegram, SiWhatsapp } from 'react-icons/si';

// Custom icons as React components
import { ProfiIcon } from './profi-icon';
import { MaxIcon } from './max-icon';
```

For the custom icons, create minimal SVG components:

```tsx
// Example: max-icon.tsx
export const MaxIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    {/* path data from official Max logo */}
  </svg>
);
```

Bundle impact: `react-icons` uses ES module tree-shaking. Importing 3 icons adds ~1-2 KB total (just the SVG path data). The two custom SVGs add negligible weight.

**Alternatives considered**:
- **`react-social-icons`**: Convenient (pass URL, get icon), but imports the entire icon set (~200+ icons). Not tree-shakeable by URL pattern. Adds unnecessary weight.
- **Font Awesome**: Doesn't include VK in the free tier. Missing Profi.ru and Max entirely.
- **All custom SVGs (no library)**: Maximum control, but reinventing the wheel for standard brands. Mixing `react-icons` for known brands + custom for niche ones is the best balance.
- **Icon font**: Worse performance than inline SVG (extra network request, no tree-shaking, harder to style).
- **Image files (PNG/WebP)**: Blurry at different sizes, not colorable via CSS, extra network requests.

**Sources**:
- [React Icons - Simple Icons set](https://react-icons.github.io/react-icons/icons/si/)
- [Simple Icons - brand icon collection](https://simpleicons.org/)
- [Max (app) logo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Max_(app)_logo.svg)
- [Profi.ru brand assets on Brandfetch](https://brandfetch.com/profi.ru)

---

## Topic 5: Nginx Subdomain Configuration

**Decision**: Separate Nginx server block for `teacher.kaluger.ru` serving the Next.js static export from a dedicated directory. Separate Certbot certificate (or expand existing one).

**Rationale**: Each subdomain gets its own `server { }` block in Nginx, pointing to its own document root. This is the standard approach for serving multiple sites on one server and keeps the landing page completely isolated from the main app at `tutor.kaluger.ru`.

Nginx configuration (`/etc/nginx/sites-available/teacher.kaluger.ru`):

```nginx
server {
    listen 80;
    server_name teacher.kaluger.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name teacher.kaluger.ru;

    ssl_certificate /etc/letsencrypt/live/teacher.kaluger.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/teacher.kaluger.ru/privkey.pem;

    root /home/roman-kaluger/kaluger-super-app/landing/out;
    index index.html;

    # Next.js static export with trailingSlash: true
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache images
    location /images/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;
}
```

SSL setup steps:
1. Add DNS A record for `teacher.kaluger.ru` pointing to VPS IP `31.207.74.174`
2. Obtain certificate: `sudo certbot --nginx -d teacher.kaluger.ru`
3. Enable site: `sudo ln -s /etc/nginx/sites-available/teacher.kaluger.ru /etc/nginx/sites-enabled/`
4. Test and reload: `sudo nginx -t && sudo systemctl reload nginx`

Alternative SSL approach -- wildcard certificate for `*.kaluger.ru`:
```bash
sudo certbot certonly --manual --preferred-challenges=dns -d "*.kaluger.ru" -d "kaluger.ru"
```
This requires DNS TXT record validation (not HTTP) and covers all subdomains. However, per-subdomain certificates via `certbot --nginx` are simpler for auto-renewal and don't require DNS API access.

**Alternatives considered**:
- **Same domain with path prefix** (`tutor.kaluger.ru/landing/`): Requires `basePath` in Next.js config and complicates Nginx routing with the existing app. Subdomain is cleaner.
- **Wildcard certificate**: More elegant for many subdomains, but requires DNS plugin for auto-renewal (Certbot DNS plugin for the domain registrar). For just two subdomains, individual certificates are simpler.
- **Cloudflare / CDN**: Would add a CDN layer for caching. Overkill for a single-page landing with few visitors initially. Can be added later.

**Sources**:
- [Configuring multiple subdomains on Nginx](https://auro.technology/blog/configuring-multiple-subdomains-on-an-nginx-webserver)
- [DigitalOcean: Let's Encrypt Wildcard Certificates](https://www.digitalocean.com/community/tutorials/how-to-create-let-s-encrypt-wildcard-certificates-with-certbot)
- [Next.js Static Export Nginx config](https://nextjs.org/docs/app/guides/static-exports)

---

## Topic 6: Next.js Image Optimization in Static Export

**Decision**: Use `images: { unoptimized: true }` in `next.config.ts` and handle image optimization at build time with manual tooling (sharp CLI or squoosh). Use standard `<img>` via `next/image` with `unoptimized` for semantic benefits.

**Rationale**: The default Next.js Image Optimization API requires a running Node.js server to resize/optimize images on-demand. This is incompatible with `output: 'export'`. There are three options:

### Option A: `unoptimized: true` (chosen)

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

With this setting, `next/image` renders a standard `<img>` tag without srcset/size optimization. We pre-optimize images manually before committing them:

```bash
# Convert to WebP and resize at build time using sharp-cli
npx sharp-cli resize 800 --format webp --quality 80 -i public/images/*.jpg -o public/images/optimized/
```

For a landing page with 5-10 images, manual optimization is perfectly manageable:
1. Export images in WebP format at 2x display resolution
2. Use `width`/`height` props on `next/image` to prevent layout shift (CLS)
3. Add `loading="lazy"` for below-fold images (default behavior of `next/image`)
4. Provide responsive images via `<picture>` element with `srcSet` when needed

### Option B: `next-image-export-optimizer` (viable alternative)

```bash
npm install next-image-export-optimizer
```

This package wraps `next/image` and optimizes images at build time (after `next build`). It generates multiple resolutions and formats (WebP, AVIF) and creates proper `srcset` attributes. It uses content hashing to cache already-optimized images between builds.

Pros: Automated srcset generation, multiple formats, responsive images
Cons: Adds build complexity, another dependency, slower builds

### Option C: Custom loader with external service

Use Cloudinary, Imgix, or similar CDN-based image optimization:

```ts
// my-loader.ts
export default function cloudinaryLoader({ src, width, quality }: {
  src: string; width: number; quality?: number;
}) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  return `https://res.cloudinary.com/demo/image/upload/${params.join(',')}${src}`;
}
```

Pros: Dynamic optimization, no build-time processing
Cons: External service dependency, potential costs, network dependency

**For our landing page**: Option A is sufficient. The page has a small, fixed set of images (hero photo, section backgrounds, tutor photo). Pre-optimizing them as WebP at appropriate sizes is a one-time effort with minimal maintenance overhead.

**Alternatives considered**: See Options B and C above.

**Sources**:
- [Next.js Image Component docs](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js Static Exports - Image Optimization](https://nextjs.org/docs/app/guides/static-exports#image-optimization)
- [next-image-export-optimizer on GitHub](https://github.com/Niels-IO/next-image-export-optimizer)
- [next-export-optimize-images](https://next-export-optimize-images.vercel.app/)

---

## Topic 7: CI/CD Integration

**Decision**: Add a `landing` job to `ci.yml` (lint + type check + build) and a landing build + deploy step to `deploy.yml`. Use path filtering to skip landing CI when only frontend/backend files change.

**Rationale**: The existing CI/CD setup has two workflow files: `ci.yml` (runs on PRs to main) with separate `frontend`, `frontend-tests`, and `backend` jobs; and `deploy.yml` (runs on push to main) with a single sequential `deploy` job. The landing page integrates naturally as a third project.

### CI Workflow Addition (`ci.yml`)

Add a new job for the landing page:

```yaml
  landing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: landing/package-lock.json

      - name: Install dependencies
        run: cd landing && npm ci

      - name: Lint
        run: cd landing && npm run lint

      - name: Type check
        run: cd landing && npx tsc --noEmit

      - name: Build
        run: cd landing && npm run build
```

Optionally, add path filtering to avoid running landing CI when only backend/frontend files change:

```yaml
on:
  pull_request:
    branches: [main]
    # Note: path filtering applies to the entire workflow, not individual jobs.
    # For per-job filtering, use dorny/paths-filter action or conditional steps.
```

For per-job path filtering, use the `dorny/paths-filter` action:

```yaml
  changes:
    runs-on: ubuntu-latest
    outputs:
      landing: ${{ steps.filter.outputs.landing }}
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            landing:
              - 'landing/**'
            frontend:
              - 'frontend/**'
            backend:
              - 'backend/**'

  landing:
    needs: changes
    if: ${{ needs.changes.outputs.landing == 'true' }}
    # ... rest of job
```

However, for simplicity and reliability, running all jobs on every PR is acceptable for a small monorepo. Path filtering can be added later if CI times become an issue.

### Deploy Workflow Addition (`deploy.yml`)

Add landing build and deploy steps to the existing sequential deploy job:

```yaml
      - name: Build landing
        run: cd landing && npm ci && npm run build

      - name: Deploy landing
        run: rsync -avz --delete landing/out/ vps:/home/roman-kaluger/kaluger-super-app/landing/out/
```

These steps slot in after the existing frontend/backend build steps and before the SSH restart commands. The landing page is purely static files, so no server restart is needed -- just rsync the `out/` directory.

Updated `cache-dependency-path` in `deploy.yml`:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: |
            frontend/package-lock.json
            backend/package-lock.json
            landing/package-lock.json
```

### Directory Structure in Monorepo

```
kaluger-super-app/
  frontend/          # React CRA app (tutor.kaluger.ru)
  backend/           # Express API
  landing/           # Next.js static landing (teacher.kaluger.ru)
    package.json
    next.config.ts
    postcss.config.mjs
    tsconfig.json
    app/
      layout.tsx
      page.tsx
      globals.css
    public/
      images/
    out/              # build output (gitignored)
```

**Alternatives considered**:
- **Separate repository**: Isolates CI completely but fragments the monorepo. Harder to share types or constants between projects.
- **Nx / Turborepo**: Sophisticated monorepo build orchestration with caching. Overkill for three independent projects with no shared dependencies. Adds significant tooling complexity.
- **Separate workflow file** (`ci-landing.yml`): Cleaner separation, but since the existing pattern uses a single `ci.yml` with multiple jobs, adding another job is consistent.
- **Docker-based deploy**: More reproducible but adds container infrastructure overhead. The current rsync-based deploy is simple and effective.

**Sources**:
- [How to Configure GitHub Actions for Monorepos](https://oneuptime.com/blog/post/2026-02-02-github-actions-monorepos/view)
- [Creating separate monorepo CI/CD pipelines with GitHub Actions](https://blog.logrocket.com/creating-separate-monorepo-ci-cd-pipelines-github-actions/)
- [dorny/paths-filter GitHub Action](https://github.com/dorny/paths-filter)
