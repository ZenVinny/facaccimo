# facaccimo

A static web app for managing [cubari.moe](https://cubari.moe) sources, straight from a GitHub repository.

The browser clones your source repo, edits the chapter JSON files, and commits the result back to GitHub — no server-side component, no database.

## What it does

**Series list** — search by title or file name, see chapter and volume counts, and open, edit or delete a series.

**Series editor** — title, artist, author, description and cover URL, with:
- metadata import from [MangaBaka](https://mangabaka.org)
- cover and chapter import from MangaDex

**Chapter table** — multi-select, batch creation by number range, group volume editing, per-row edit and delete, and batch deletion of the selected rows.

**Chapter editor** — pages, group name, proxy mode and last-updated date, with page-list imports from:
- Google Drive
- Reddit posts and galleries
- Imgur albums

**Cubari link** — generates the `https://cubari.moe/proxy/gist/<slug>/` URL as a clickable, single-line link field, with a **Copy** action.

## Requirements

- Node.js with npm
- A GitHub **Personal Access Token** with `repo` and `user:email` scopes — create one [here](https://github.com/settings/tokens/new?scopes=repo,user:email&description=facaccimo)
- A CORS proxy reachable from the page (see below)

## Running it

```bash
npm install
./start.sh          # CORS proxy + preview of the production build on :8080
./start.sh dev      # dev server with hot reload
./start.sh build    # build only, then exit → dist/
./start.sh build --fast   # build without minification (faster, larger output)
```

`start.sh` starts the CORS proxy on port **3000** and serves the app on port **8080**, and stops both on Ctrl+C. It also exports `NODE_OPTIONS=--openssl-legacy-provider`, a compatibility flag for older OpenSSL builds — harmless if your Node does not need it.

On Windows you can use the npm scripts instead:

```bash
npm run serve   # dev server
npm run build   # production build
npm run lint    # eslint
npm run proxy   # CORS proxy only
```

> The npm scripts set the OpenSSL flag with `SET`, which is cmd.exe syntax. On Linux, macOS or Termux use `./start.sh` (or export `NODE_OPTIONS=--openssl-legacy-provider` yourself first).

## The CORS proxy

GitHub's git transport (`info/refs`, upload-pack and receive-pack on `github.com`) and the manga cover hosts do not send CORS headers, so the app routes those requests through a small local proxy. (The GitHub REST API does send `access-control-allow-origin`, so it is only wrapped for convenience.)

Start it with:

```bash
npm run proxy       # dev-cors-proxy.js, listens on http://localhost:3000
```

The address is configured in `src/CorsProxy.js` (`URL` and `DEV_URL`, both `http://localhost:3000`). The app checks the proxy on load and warns if it is unreachable.

## Building and deploying

```bash
npm run build       # or ./start.sh build
```

Output goes to `dist/` (`index.html`, `js/`, `css/`, `favicon.ico`). Because `vue.config.js` sets `publicPath: './'`, the folder can be dropped into any subdirectory of a static host.

Deploying means copying `dist/` **and** having the CORS proxy running, because there is no backend:

- the static host only serves files — the proxy is **not** part of the deployment;
- `src/CorsProxy.js` points at `http://localhost:3000`, so the proxy runs on the machine whose browser opens the app — start it with `npm run proxy`, or let `./start.sh` do it;
- if you move the proxy elsewhere, change `URL` in `src/CorsProxy.js` and add CORS headers there.

## Project layout

```
public/index.html      HTML shell
src/main.js            app bootstrap, global dialog helpers
src/App.vue            page router + GitHub clone/save plumbing
src/ui.js              themed naive-ui dialogs (prompt, two-field prompt, confirm, link)
                       and toasts — no native alert/confirm/prompt
src/theme.css          dark theme, layout and component styling
src/pages/
  HomePage.vue         onboarding wizard (token, repo, save credentials)
  SeriesManager.vue    series list
  ChapterManager.vue   series editor + chapter table
  ChapterEditor.vue    single chapter editor
src/components/
  RepoList.vue         repo picker used by the wizard
src/model/
  Series.js            series JSON model
  Chapter.js           chapter JSON model
  Groups.js            group/proxy URL helpers
  MangaBaka.js         metadata search API
  MangaDex.js          covers and chapter lists API
  Proxy.js             page proxy URL helpers
src/GitHubUtils.js     clone, commit, topics, repo creation (isomorphic-git + github-api)
src/CorsProxy.js       proxy URL configuration
src/GDrive.js          Google Drive URL parsing
src/Reddit.js          Reddit galleries/posts parsing
src/Imgur.js           Imgur album parsing
dev-cors-proxy.js      local CORS proxy (port 3000)
start.sh               proxy + app launcher
vue.config.js          build config, Node polyfill fallbacks, Buffer ProvidePlugin
```

## Changelog

Changes are recorded in [`CHANGELOGS.md`](CHANGELOGS.md). Each entry is a single line with a timestamp in `MM.DD.YYYY` format followed by a short description of the change and the affected files. Entries are ordered newest first (most recent at the top).

To get the current timestamp for a new entry, open the browser console on any page and run (this step is mandatory — do not guess or reuse a previous date):

```js
const d = new Date();
const pad = n => String(n).padStart(2, '0');
pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + '.' + d.getFullYear();
```

Copy the result and prefix your changelog line with it. Using any other date is not allowed.

## Tech

Vue 3 (Options API) · naive-ui · Vue CLI 5 / webpack 5 · isomorphic-git + lightning-fs (in-browser repo clone) · github-api · buffer polyfill.

## Notes and limitations

- The Personal Access Token is kept in `localStorage` in plain text. Use a scoped token and a machine you trust; revoke it when you are done.
- The cloned repository and every parsed series are held in memory for the session, so very large libraries use a lot of RAM.
- Everything runs client-side, which is why the CORS proxy is mandatory rather than optional.
