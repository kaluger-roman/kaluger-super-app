# Landing

This is a separate Next.js static-export package, not the CRA frontend. Follow
existing Next.js/Tailwind patterns and required default exports in routes/config.
Do not apply frontend FSD/Effector rules to this package indiscriminately.

Commands here: `npm run dev -- --port 3100`, `npm run lint`, `npm test`, `npm run build`.
Root `npm run check` does not cover this package. Preserve static-export compatibility,
Russian copy, accessibility and responsive layout. Deployment remains a separate task.
