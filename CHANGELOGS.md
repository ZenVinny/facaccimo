# Changelog

11.22.2026 — Fixed volume input handler syntax (src/pages/ChapterEditor.vue)
11.22.2026 — Normalized whitespace in new series filenames (src/pages/SeriesManager.vue)
11.22.2026 — Guarded chapterCount/volumeCount against missing data (src/pages/SeriesManager.vue)
11.22.2026 — Added caption and scope to the series table (src/pages/SeriesManager.vue)
11.22.2026 — Guarded cover thumbnail fetches against modal close (src/pages/ChapterManager.vue)
11.22.2026 — Made MangaBaka metadata import fill description only when empty (src/pages/ChapterManager.vue)
11.22.2026 — Added dialog semantics to ChapterManager modals (src/pages/ChapterManager.vue)
11.22.2026 — Coerced volume input to avoid null values (src/pages/ChapterEditor.vue)
11.22.2026 — Guarded Imgur import against empty results (src/pages/ChapterEditor.vue)
11.22.2026 — Added isProxy watch to convert proxy URLs on toggle (src/pages/ChapterEditor.vue)
11.22.2026 — Fixed compareChapterNames to use a total order (numeric then lexical) (src/pages/ChapterManager.vue)
11.22.2026 — Guarded row rendering against missing chapter entries (src/pages/ChapterManager.vue)
11.22.2026 — Made editChapter derive defaults from the highest sorted chapter (src/pages/ChapterManager.vue)
11.22.2026 — Made addNewChapter compute the highest numeric key independently of sort (src/pages/ChapterManager.vue)
11.22.2026 — Closed the MangaDex cover modal on fetch failure via finally (src/pages/ChapterManager.vue)
11.22.2026 — Handled cancellation in the HomePage token validation flow (src/pages/HomePage.vue)
11.22.2026 — Restricted goToManager profile failures to 401/403 (src/pages/HomePage.vue)
11.22.2026 — Validated empty repository names before creation (src/pages/HomePage.vue)
11.22.2026 — Prevented save from clobbering an existing group (src/pages/ChapterEditor.vue)
11.22.2026 — Guarded ChapterEditor beforeMount against a missing chapter (src/pages/ChapterEditor.vue)
11.22.2026 — Guarded the GitHub topics check against malformed responses (src/App.vue)
11.22.2026 — Made discardSeries confirm before discarding unsaved edits (src/App.vue)
11.22.2026 — Restricted ENOENT handling to err.code/errno instead of message text (src/App.vue)
11.22.2026 — Wrapped onSuccess in try/catch in forcePush (src/App.vue)
11.22.2026 — Gated onBeforeUnload warning on the dirty flag only (src/App.vue)
11.22.2026 — Deduplicated page entries before diff counts (src/App.vue)
11.22.2026 — Made isBlankPage type-aware (src/App.vue)
11.22.2026 — Removed target/this mixing in showUrl (src/App.vue)
11.22.2026 — Removed the 60s auto-cancel timer so long operations are not falsely cancelled (src/App.vue)
11.22.2026 — Merged the duplicate beforeUnmount hook so timer cleanup survives (src/App.vue)
11.22.2026 — Attached error logging to fire-and-forget Discord webhook calls (src/App.vue)
11.22.2026 — Reset stale in-memory state when the cloneRepo email prompt is cancelled (src/App.vue)
11.22.2026 — Kept extensionless series in the list when the rename dialog is cancelled (src/App.vue)
11.22.2026 — Extracted shared post-save routine in saveSeries to remove duplicated force-push logic (src/App.vue)
11.22.2026 — Made goToChapter always use a detached chapter copy (src/App.vue)
11.22.2026 — Stopped saveChapter from clearing dirty while series-level changes remain unsaved (src/App.vue)
11.22.2026 — Guarded restoreChapterScroll against null table positions (src/App.vue)
11.22.2026 — Removed the misleading Cancel button from the loading overlay (src/App.vue)
11.22.2026 — Added missing `CorsProxy` import in App.vue so the startup proxy check no longer throws a ReferenceError (src/App.vue)
11.22.2026 — Guarded `parseData` against non-array `readdir` results (src/App.vue)
11.22.2026 — Deferred `renameChapters` state updates until renames resolve (src/App.vue)
11.22.2026 — Made `forcePush` return a promise and awaited it in the `deleteSeries` remote-changed path (src/App.vue)
11.22.2026 — Initialized `dirty=false` when opening an existing series (src/App.vue)
11.21.2026 — Fixed spurious page diff in Discord webhook: placeholder empty/null page entries are no longer counted as real pages, so chapters with no images no longer report "1 -> 1 (+1 page, -1 page)" (src/App.vue)

11.20.2026 — Fixed date drift on chapter save: last_updated is now only updated when the datetime field actually changed, preserving the original timestamp (including seconds) when only other fields are edited (src/pages/ChapterEditor.vue)

11.20.2026 — Discord webhook notifications now send one embed per changed entry (chapter/metadata) with old→new values in ```diff blocks, and split into multiple messages when exceeding 2000 chars (src/DiscordWebhook.js, src/App.vue)

11.20.2026 — Added optional Discord webhook notifications: rich embeds on series save (with a diff of added/removed/changed chapters and metadata) and delete, fire-and-forget, configurable via the HomePage wizard and persisted in localStorage (src/DiscordWebhook.js, src/pages/HomePage.vue, src/App.vue)

11.20.2026 — Discard now confirms before discarding and guards against accidental loss: added confirmation dialogs in ChapterManager and ChapterEditor, a beforeunload handler and a dirty flag in App.vue (src/App.vue, src/pages/ChapterManager.vue, src/pages/ChapterEditor.vue)

11.20.2026 — New chapter prompt now validates input and refuses duplicate chapter numbers via a validate callback (src/pages/ChapterManager.vue)

11.20.2026 — Removed unreachable fixOldGDriveUrls method and dropped the README claim about rewriting old Drive URL formats (src/pages/ChapterManager.vue, README.md)

11.20.2026 — Cover thumbnails (object URLs) are now revoked on modal close, on cover/chapter pick success, and on component unmount (src/pages/ChapterManager.vue)

11.20.2026 — Token check failure branch now distinguishes auth errors (401/403) from transport errors and shows the real message (src/pages/HomePage.vue)

11.20.2026 — Series list now sorts by title (falling back to file name) before filtering for stable ordering (src/pages/SeriesManager.vue)

11.20.2026 — finishLoader now clears loadingStatus alongside loading flag (src/App.vue)

11.20.2026 — Loading overlay gained role="status", aria-live, aria-label, a Cancel button, and a 60-second auto-cancel timeout (src/App.vue)

11.20.2026 — SeriesManager and ChapterManager no longer share the same ref="manager"; SeriesManager ref removed (src/App.vue)

11.20.2026 — Dropped stray fourth argument from getSeriesUrl call (src/App.vue)

11.20.2026 — Removed unused ref="masthead", saved data property, and @loading/@loaded bindings on SeriesManager (src/App.vue)

11.20.2026 — Removed unused currentPage data and empty watch block (src/pages/ChapterManager.vue)

11.20.2026 — Removed unused Chapter and MangaBaka imports (src/pages/ChapterEditor.vue)

11.20.2026 — Removed dead selected state from RepoList (src/components/RepoList.vue)

11.20.2026 — Removed dead createPages method from GitHubUtils (src/GitHubUtils.js)

11.20.2026 — MangaBaka search now accepts a page argument and surfaces total count in the modal (src/model/MangaBaka.js, src/pages/ChapterManager.vue)

11.20.2026 — Fixed contrast: th.num small and .vol.empty now use var(--ink-3) (src/pages/SeriesManager.vue)

11.20.2026 — Dropped Font Awesome CDN link and replaced spinner glyph with pure-CSS spinner (public/index.html, src/App.vue)
