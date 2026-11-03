# Orbit · Consumer Intelligence Laboratory

A React + TypeScript + Vite application for exploring **voluntarily supplied, real personal records**. All analysis runs in the browser. No analytics, AI API, backend, or persistent personal storage is used. Reloading clears the session.

## Develop

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the development server at the repository base path `/Consumer-Profile-Dashboard/`. The cloud task already has an isolated checkout; do not create an additional worktree.

```sh
npm test       # parser, scoring, sensitive-topic exclusion, extension boundary tests
npm run build # TypeScript check + production bundle
npm run preview
```

## What works

- Nine navigable dashboard sections; dark/light modes and responsive navigation.
- CSV / JSON drag-and-drop imports, Google Takeout history/activity shapes, ChatGPT conversations.json, normalized order exports, and product catalogs.
- D3 force-directed category/domain networks, dragging, zoom, canvas panning, search and evidence inspection.
- Radial hourly activity, weekly heatmap, domain frequency, transparent interest shares and tentative shopping signals.
- Real product links and catalogs, category-based matches, evidence, and feedback that suppresses inaccurate category recommendations.
- Per-record and per-source removal, Chrome disconnect and full session reset.
- Optional-permission Manifest V3 connector and downloadable unpacked test package.

Starts empty. Test fixtures are synthetic and used only in tests, never presented as a personal profile.

## Imports

A browsing CSV uses `url,title,timestamp` (ISO, Unix seconds or milliseconds). JSON may be an array, `{ "records": [...] }`, `{ "history": [...] }`, Google Takeout `{ "Browser History": [...] }`, or activity entries with `titleUrl,title,time`. Chromium `time_usec` and Unix microsecond timestamps are supported. Unknown timestamps remain unknown and are excluded from temporal charts. Data is capped at 100,000 entries / 30 MB per file. Duplicate record identities are skipped.

Catalog JSON: `{ "products": [{ "name": "...", "url": "https://...", "category": "Technology", "price": "..." }] }`. CSV catalogs must include name, url and category or price. Prices are optional, imported, **unverified**, and never fabricated. Images are deliberately not fetched because third-party image requests can disclose user activity. Retailer scraping and verified live pricing are not implemented.

ChatGPT imports consider user-role messages only, removing quoted lines, quoted strings and fenced code. This is a conservative heuristic, not a guarantee that all quoted material is recognized; review and delete unwanted records. Arbitrary retailer-specific order schemas must first be normalized to the browsing schema. Invalid files show a readable error.

## Chrome connector

No account login grants history access. The dashboard needs the packaged extension.

1. Download `orbit-extension.zip` from the connection dialog, or use `public/extension` directly.
2. In Chrome's Extensions page, enable Developer mode → Load unpacked → select the extracted folder.
3. Open the dashboard, then click **Approve & analyze my history**.
4. In the Orbit toolbar popup, explicitly approve the optional history permission; return to the dashboard and start analysis.

Chrome requires an extension-owned user gesture for optional permissions, so an initial toolbar approval may be needed. History access is limited to 7 / 30 / 90 days and up to 10,000 URL entries. Each URL has its last visit time; this is not a complete log of every visit, nor time spent. Only the exact GitHub Pages project path and local development origin are allowed. The dashboard disconnect control removes Chrome-sourced records and asks the extension to revoke history permission. Chrome's extension settings can always revoke or uninstall it independently. Revoking in the toolbar does not delete records already imported into the tab; use dashboard deletion too.

See [extension distribution notes](EXTENSION.md). **Not published to Chrome Web Store.** Real user installation and Chrome's native permission dialog need manual validation; automated background tests mock Chrome APIs.

## Interpretation and privacy limits

Six non-sensitive categories use explicit title/domain keyword rules. Unknown and sensitive-keyword topics remain unclassified. This is explainable local inference, not an external language model or validated psychological measurement. Sensitive keyword exclusions are conservative heuristics, not a comprehensive content filter. No sensitive characteristics are inferred. A product match is `35 + 60 × category share` capped at 95; inaccurate feedback excludes the category. Graph communities follow declared categories, not an independent community detection algorithm. Price sensitivity is explicitly insufficient without supporting evidence. Work, shared devices, missing history and sampling can distort inferences.

Only voluntarily supplied files and explicitly approved extension results are read. Personal data remains in memory, including product links and feedback. Source links open only when clicked. There are no external fonts, images, tracking pixels or automatic third-party calls. Do not add private exports to the repository. `.gitignore` excludes `private-data/` and environment files; put personal exports outside the checkout whenever possible.

## GitHub Pages

The workflow `.github/workflows/deploy.yml` builds and tests on pushes to `main`, then deploys `dist` through GitHub Pages. Set the repository's **Settings → Pages → Source** to **GitHub Actions**. Publishing code, pushing commits and enabling Pages must be authorized separately. No deployment has been performed by building this project.

The Vite base is `/Consumer-Profile-Dashboard/`. If repository ownership or path changes, update both the base and extension authorized origin/path; rebuild the extension ZIP after changing its source. The intended URL after successful deployment is `https://jilliankoppy.github.io/Consumer-Profile-Dashboard/`; its availability is not assumed.

## Browser regression checks

With the dev server running, run `npm run test:browser`. The suite uses system Chromium if installed; otherwise use `npx playwright install chromium` on a network that permits Playwright downloads, or set `CHROMIUM_PATH`. To test the production build, start `npm run preview -- --port 4173` and run `APP_URL=http://localhost:4173/Consumer-Profile-Dashboard/ npm run test:browser`. Tests cover import, graph evidence, navigation, product matching, feedback, deletion, refresh privacy, and mobile layout using synthetic test-only records in a fresh browser context. Screenshots are written to `/tmp`, outside the repository. Automated extension unit tests mock Chrome APIs; native installation and permission approval are separate manual checks.
