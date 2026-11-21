# Changelog

11.20.2026 | 07:12 — Discard now confirms before discarding and guards against accidental loss: added confirmation dialogs in ChapterManager and ChapterEditor, a beforeunload handler and a dirty flag in App.vue (src/App.vue, src/pages/ChapterManager.vue, src/pages/ChapterEditor.vue)

11.20.2026 | 07:12 — New chapter prompt now validates input and refuses duplicate chapter numbers via a validate callback (src/pages/ChapterManager.vue)

11.20.2026 | 07:12 — Removed unreachable fixOldGDriveUrls method and dropped the README claim about rewriting old Drive URL formats (src/pages/ChapterManager.vue, README.md)

11.20.2026 | 07:12 — Cover thumbnails (object URLs) are now revoked on modal close, on cover/chapter pick success, and on component unmount (src/pages/ChapterManager.vue)

11.20.2026 | 07:12 — Token check failure branch now distinguishes auth errors (401/403) from transport errors and shows the real message (src/pages/HomePage.vue)

11.20.2026 | 07:12 — Series list now sorts by title (falling back to file name) before filtering for stable ordering (src/pages/SeriesManager.vue)

11.20.2026 | 07:12 — finishLoader now clears loadingStatus alongside loading flag (src/App.vue)

11.20.2026 | 07:12 — Loading overlay gained role="status", aria-live, aria-label, a Cancel button, and a 60-second auto-cancel timeout (src/App.vue)

11.20.2026 | 07:12 — SeriesManager and ChapterManager no longer share the same ref="manager"; SeriesManager ref removed (src/App.vue)

11.20.2026 | 07:12 — Dropped stray fourth argument from getSeriesUrl call (src/App.vue)

11.20.2026 | 07:12 — Removed unused ref="masthead", saved data property, and @loading/@loaded bindings on SeriesManager (src/App.vue)

11.20.2026 | 07:12 — Removed unused currentPage data and empty watch block (src/pages/ChapterManager.vue)

11.20.2026 | 07:12 — Removed unused Chapter and MangaBaka imports (src/pages/ChapterEditor.vue)

11.20.2026 | 07:12 — Removed dead selected state from RepoList (src/components/RepoList.vue)

11.20.2026 | 07:12 — Removed dead createPages method from GitHubUtils (src/GitHubUtils.js)

11.20.2026 | 07:12 — MangaBaka search now accepts a page argument and surfaces total count in the modal (src/model/MangaBaka.js, src/pages/ChapterManager.vue)

11.20.2026 | 07:12 — Fixed contrast: th.num small and .vol.empty now use var(--ink-3) (src/pages/SeriesManager.vue)

11.20.2026 | 07:12 — Dropped Font Awesome CDN link and replaced spinner glyph with pure-CSS spinner (public/index.html, src/App.vue)
11.20.2026 | 13:25 — Added optional Discord webhook notifications: rich embeds on series save (with a diff of added/removed/changed chapters and metadata) and delete, fire-and-forget, configurable via the HomePage wizard and persisted in localStorage (src/DiscordWebhook.js, src/pages/HomePage.vue, src/App.vue)
11.20.2026 | 14:00 — Discord webhook notifications now send one embed per changed entry (chapter/metadata) with old→new values in ```diff blocks, and split into multiple messages when exceeding 2000 chars (src/DiscordWebhook.js, src/App.vue)
11.20.2026 | 14:17 — Fixed date drift on chapter save: last_updated is now only updated when the datetime field actually changed, preserving the original timestamp (including seconds) when only other fields are edited (src/pages/ChapterEditor.vue)
