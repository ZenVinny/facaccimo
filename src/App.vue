<template>
  <div id="app" class="container">
    <div v-if="loading" class="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div class="card">
        <div class="card-content">
          <div class="content">
            <span class="spinner" aria-hidden="true"></span>
            {{ loadingStatus || 'Loading…' }}
          </div>

        </div>
      </div>
    </div>
    <header class="masthead">
      <div class="crumb">
        <span>facaccimo</span>
        <span aria-hidden="true">/</span>
        <b>{{ repoName || 'not connected' }}</b>
      </div>
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-sub" v-if="pageSub">{{ pageSub }}</p>
    </header>
    <HomePage v-if="page === HOME_PAGE" @finished="cloneRepo" @loading="displayLoader"
              @loaded="finishLoader"/>
    <SeriesManager v-if="page === SERIES_MANAGER_PAGE" :series="series" @series="goToSeries"
                   @delete="deleteSeries" @show="showUrl"/>
    <ChapterManager v-if="page === CHAPTER_MANAGER_PAGE" ref="manager" :name="fileName" :series="selectedSeries"
                    @discard="discardSeries" @save="saveSeries" @chapter="goToChapter"
                    @loading="displayLoader" @loaded="finishLoader"/>
    <ChapterEditor v-if="page === CHAPTER_EDITOR_PAGE" :chapterKey="chapterKey" :chapter="chapter"
                   @discard="discardChapter" @save="saveChapter" @loading="displayLoader"
                   @loaded="finishLoader"/>
  </div>
</template>

<script>
import HomePage from "@/pages/HomePage";
import SeriesManager from "@/pages/SeriesManager";
import ChapterManager from "@/pages/ChapterManager";
import GitHubUtils from "@/GitHubUtils";
import Series from "@/model/Series";
import Chapter from "@/model/Chapter";
import ChapterEditor from "@/pages/ChapterEditor";
import DiscordWebhook from "./DiscordWebhook";
import CorsProxy from "@/CorsProxy";

export default {
  name: 'App',
  components: {
    ChapterEditor,
    ChapterManager,
    HomePage,
    SeriesManager
  },
  computed: {
    pageTitle() {
      if (this.page === this.SERIES_MANAGER_PAGE) {
        return 'Series';
      }
      if (this.page === this.CHAPTER_MANAGER_PAGE) {
        return (this.selectedSeries && this.selectedSeries.title) || this.fileName || 'Series';
      }
      if (this.page === this.CHAPTER_EDITOR_PAGE) {
        return 'Chapter ' + this.chapterKey;
      }
      return 'Get started';
    },
    pageSub() {
      if (this.page === this.HOME_PAGE) {
        return 'Easy cubari.moe sources, straight from your repository.';
      }
      if (this.page === this.SERIES_MANAGER_PAGE) {
        return this.repoName || '';
      }
      return this.fileName || '';
    }
  },
  methods: {
    showUrl(fileName) {
      this.loadingStatus = 'Creating URL';
      this.loading = true;
      GitHubUtils.getCurrentBranch(this.repoName, this.fs).then(value => {
        return GitHubUtils.getBase64EncodedSlug(
          GitHubUtils.getSeriesUrl(fileName, value, this.repoName)
        );
      }).then(value => {
        this.loading = false;
        let url = 'https://cubari.moe/proxy/gist/' + value + '/';
        this.$link({
          title: 'Cubari URL',
          text: fileName,
          url,
        });
      }).catch(err => {
        console.error(err);
        this.loading = false;
        this.loadingStatus = '';
        this.$message.error('Failed to create URL: ' + (err && err.message ? err.message : 'unknown error'));
      })
    },
    async cloneRepo(data) {
      this.pat = data.pat;
      this.username = data.username;
      this.repoName = data.repoName;
      this.email = data.email;
      this.discordWebhook = data.discordWebhook || '';
      let target = this;
      if (this.email === '') {
        const email = await this.$prompt({
          title: 'Email for commits',
          text: 'Provide the email address that will be associated with your commits (usually the same as your GitHub one).',
          placeholder: 'user@example.org',
          positiveText: 'Continue',
          validate: value => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(value).toLowerCase())
            ? null
            : 'Invalid email address'
        });
        if (!email) {
          this.pat = '';
          this.username = '';
          this.repoName = '';
          this.discordWebhook = '';
          this.fs = null;
          target.loading = false;
          return;
        }
        target.email = email;
        window.localStorage.setItem('email', target.email);
      }
      target.loading = true;
      target.loadingStatus = 'Cloning repo';
      GitHubUtils.cloneRepo(this.repoName).then(value => {
        target.fs = value;
        target.loadingStatus = 'Parsing data';
        target.parseData();
      }).catch((err) => {
        console.error(err);
        target.loading = false;
        target.loadingStatus = '';
        this.$message.error('Failed to clone repo!\n' + err.message);
      })
    },
    parseData(/*createIndex*/) {
      this.series = [];
      let noExt = [];
      this.fs.readdir('/', {}, (err, files) => {
        if (err) {
          this.loading = false;
          this.loadingStatus = '';
          this.$message.error('Failed to read the repository: ' + (err && err.message ? err.message : err));
          return;
        }
        if (!Array.isArray(files)) {
          this.loading = false;
          this.loadingStatus = '';
          this.$message.error('Failed to read the repository: unexpected file list');
          return;
        }
        let promises = [];
        files.forEach(file => {
          if (file.endsWith('.json') && file !== 'index.json') {
            promises.push(this.fs.promises.readFile('/' + file, {}).then(data => {
              this.loadingStatus = 'Parsing ' + file;
              try {
                this.series.push({
                  name: file,
                  data: Series.fromJson(JSON.parse(new TextDecoder().decode(data)))
                });
              } catch (e) {
                this.$message.error('Failed to parse ' + file + ': ' + e.message);
              }
            }).catch(e => {
              this.$message.error('Failed to read ' + file + ': ' + (e && e.message ? e.message : e));
            }))
          } else if (file.indexOf('.') === -1) {
            promises.push(this.fs.promises.readFile('/' + file, {}).then(data => {
              this.loadingStatus = 'Parsing ' + file;
              try {
                noExt.push({
                  name: file,
                  data: Series.fromJson(JSON.parse(new TextDecoder().decode(data)))
                });
              } catch {
                // We only check whether those files potentially could be series
              }
            }).catch(e => {
              this.$message.error('Failed to read ' + file + ': ' + (e && e.message ? e.message : e));
            }))
          }
        });
        return Promise.all(promises).then(async () => {
          this.loading = false;
          this.loadingStatus = '';
          if (noExt.length > 0) {
            // rename files without extension
            let noExtNames = noExt.map(item => item.name).join(', ');
            this.$dialog.warning({
              title: 'Rename files?',
              content: 'The following files do not have .json extension: ' + noExtNames + '. Do you want to rename them?',
              positiveText: 'Rename',
              negativeText: 'Cancel',
              onPositiveClick: () => {
                this.renameChapters(noExt);
              },
              onNegativeClick: () => {
                noExt.forEach(item => this.series.push(item));
                this.page = this.SERIES_MANAGER_PAGE;
              }
            });
          } else {
            this.page = this.SERIES_MANAGER_PAGE;
          }
          if (!window.localStorage || !window.localStorage.getItem('skipTopics')) {
            GitHubUtils.getTopics(this.repoName, this.username, this.pat).then(value => {
              let names = value && value.data && Array.isArray(value.data.names) ? value.data.names : null;
              if (!names) return;
              if (names.indexOf('cubari-source') === -1) {
                this.$dialog.warning({
                  title: 'Add GitHub topic?',
                  content: 'Do you want to add "cubari-source" topic to the repo, so that it will be possible to discover?',
                  positiveText: 'Add',
                  negativeText: 'Cancel',
                  onPositiveClick: () => {
                    names.push('cubari-source');
                    return GitHubUtils.setTopics(names, this.repoName, this.username, this.pat)
                        .catch(e => {
                          console.error(e);
                          this.$message.error('Failed to add the topic: ' + (e && e.message ? e.message : 'unknown error'));
                        });
                  },
                  onNegativeClick: () => {
                    window.localStorage.setItem('skipTopics', "1");
                  }
                });
              }
            })
                .catch(e => {
                  // Optional convenience feature: never block the series list for it.
                  console.error('Failed to check repository topics', e);
                })
          }
        }).catch(e => {
          this.loading = false;
          this.loadingStatus = '';
          this.$message.error('Failed to parse the repository: ' + (e && e.message ? e.message : e));
        });
      })
    },
    renameChapters(noExt) {
      let target = this;
      this.loadingStatus = "Renaming files";
      this.loading = true;
      let promises = [];
      for (const item of noExt) {
        promises.push(Promise.all([
          this.fs.promises.rename('/' + item.name, '/' + item.name + '.json'),
          GitHubUtils.rename(item.name, item.name + '.json', this.fs)
        ]).then(() => {
          item.name = item.name + '.json';
          this.series.push(item);
        }));
      }
      GitHubUtils.push(GitHubUtils.commit(Promise.all(promises), this.fs, 'Add .json extensions', this.email), this.fs, this.username, this.pat).then(() => {
        target.loading = false;
        this.page = this.SERIES_MANAGER_PAGE;
      }).catch(err => {
        console.error(err);
        target.loading = false;
        target.loadingStatus = '';
        this.$message.error('Failed to rename files: ' + (err && err.message ? err.message : 'unknown error'));
      })
    },
    deleteSeries(fileName) {
      this.loadingStatus = 'Deleting ' + fileName;
      this.loading = true;
      GitHubUtils.deleteSeries(fileName, this.username, this.pat, this.fs, this.email).then(() => {
        const deleted = this.series.find(s => s.name === fileName);
        this.series = this.series.filter(s => s.name !== fileName);
        this.loading = false;
        this.$message.success('Series deleted!')
        if (deleted) {
          DiscordWebhook.sendAll(this.discordWebhook, [
            DiscordWebhook.buildSummaryEmbed(deleted.data, 'delete')
          ]).catch(err => console.error('Discord webhook failed:', err));
        }
      }).catch(async err => {
        console.error(err);
        this.loading = false;
        this.loadingStatus = '';
        if (err && err.remoteChanged) {
          const ok = await this.$confirm({
            title: 'Repository changed on GitHub',
            content: err.message + ' Force-push the deletion so ' + fileName + ' is removed from the remote copy?',
            positiveText: 'Force push',
            negativeText: 'Cancel',
            type: 'warning'
          });
          if (!ok) {
            this.$message.warning('Nothing was pushed. Reload the page to pick up the remote changes.');
            return;
          }
          await this.forcePush(() => {
            const deleted = this.series.find(s => s.name === fileName);
            this.series = this.series.filter(s => s.name !== fileName);
            if (deleted) {
              DiscordWebhook.sendAll(this.discordWebhook, [
                DiscordWebhook.buildSummaryEmbed(deleted.data, 'delete')
              ]).catch(err => console.error('Discord webhook failed:', err));
            }
          }, 'Series deleted with a force push!');
          return;
        }
        this.$message.error('Failed to delete ' + fileName + ': ' + (err && err.message ? err.message : 'unknown error'));
      })
    },
    async goToSeries(name) {
      let raw;
      try {
        raw = await this.fs.promises.readFile('/' + name, {});
      } catch (err) {
        // Only a genuinely missing file means "new series": every other read
        // failure must not silently open an empty editor that would then
        // overwrite the real file on GitHub.
        if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
          this.fileName = name;
          this.selectedSeries = new Series(name.replace(/\.json$/i, ''));
          this.page = this.CHAPTER_MANAGER_PAGE;
          this.dirty = true;
          this.originalSeries = null;
          return;
        }
        this.$message.error('Failed to open ' + name + ': ' + (err && err.message ? err.message : 'unknown error'));
        return;
      }
      let series;
      try {
        series = Series.fromJson(JSON.parse(new TextDecoder().decode(raw)));
      } catch (err) {
        // Refuse to open a malformed file: its first save would replace the
        // real content with an empty series.
        this.$message.error('Failed to parse ' + name + ': ' + (err && err.message ? err.message : 'unknown error') + '. The file was left untouched.');
        return;
      }
      this.fileName = name;
      this.selectedSeries = series;
      this.page = this.CHAPTER_MANAGER_PAGE;
      this.dirty = false;
      this.originalSeries = JSON.parse(JSON.stringify(series));
    },
    async discardSeries() {
      if (this.dirty) {
        const ok = await this.$confirm({
          title: 'Discard changes?',
          content: 'All unsaved edits to this series will be lost.',
          positiveText: 'Discard',
          negativeText: 'Keep editing',
          type: 'warning'
        });
        if (!ok) return;
      }
      this.page = this.SERIES_MANAGER_PAGE;
      this.dirty = false;
    },
    saveSeries(name, series) {
      this.loadingStatus = 'Saving ' + name;
      this.loading = true;
      GitHubUtils.addSeries(name, series, this.username, this.pat, this.fs, this.email).then(() => {
        this.postSaveSeries(name, series);
        this.loading = false;
      }).catch(async e => {
        console.log(e);
        this.loading = false;
        this.loadingStatus = '';
        if (e && e.remoteChanged) {
          const ok = await this.$confirm({
            title: 'Repository changed on GitHub',
            content: e.message + ' Force-push your changes to overwrite the remote copy?',
            positiveText: 'Force push',
            negativeText: 'Cancel',
            type: 'warning'
          });
          if (!ok) {
            this.$message.warning('Nothing was pushed. Reload the page to pick up the remote changes.');
            return;
          }
          this.forcePush(() => {
            this.postSaveSeries(name, series);
          }, 'Saved ' + name + ' with a force push!');
          return;
        }
        this.$message.error('Error saving series: ' + (e && e.message ? e.message : 'unknown error'));
      });
    },
    rememberSavedSeries(name, series) {
      // Store a detached copy: the editor keeps mutating `selectedSeries`,
      // and the list must not show edits that were never saved.
      const snapshot = Series.fromJson(JSON.parse(JSON.stringify(series)));
      const existing = this.series.find(s => s.name === name);
      if (existing) {
        existing.data = snapshot;
      } else {
        this.series.push({ name: name, data: snapshot });
      }
    },
    computeSeriesDiff(oldSeries, newSeries) {
      if (!oldSeries) {
        // New series: one entry listing all chapters.
        const chapters = Object.keys(newSeries.chapters || {});
        const lines = ['+ New series'];
        chapters.slice(0, 20).forEach(k => { lines.push('+ Chapter ' + k); });
        if (chapters.length > 20) lines.push('+ ... and ' + (chapters.length - 20) + ' more');
        return [{ title: 'New series', diff: lines.join('\n') }];
      }
      const entries = [];
      const oldChapters = oldSeries.chapters || {};
      const newChapters = newSeries.chapters || {};
      const oldKeys = Object.keys(oldChapters);
      const newKeys = Object.keys(newChapters);

      // Added chapters
      const added = newKeys.filter(k => !Object.prototype.hasOwnProperty.call(oldChapters, k));
      if (added.length > 0) {
        entries.push({ title: 'Added chapters', diff: added.map(k => '+ Chapter ' + k).join('\n') });
      }

      // Removed chapters
      const removed = oldKeys.filter(k => !Object.prototype.hasOwnProperty.call(newChapters, k));
      if (removed.length > 0) {
        entries.push({ title: 'Removed chapters', diff: removed.map(k => '- Chapter ' + k).join('\n') });
      }

      // Changed chapters
      newKeys.filter(k => Object.prototype.hasOwnProperty.call(oldChapters, k)).forEach(k => {
        const o = oldChapters[k];
        const n = newChapters[k];
        const changes = [];
        if (o.title !== n.title) {
          changes.push('- title: "' + (o.title || '') + '"');
          changes.push('+ title: "' + (n.title || '') + '"');
        }
        if (o.volume !== n.volume) {
          changes.push('- volume: "' + (o.volume || '') + '"');
          changes.push('+ volume: "' + (n.volume || '') + '"');
        }
        if (o.last_updated !== n.last_updated) {
          changes.push('- date: ' + (o.last_updated || ''));
          changes.push('+ date: ' + (n.last_updated || ''));
        }
        const oldPages = Array.isArray(o.groups) ? o.groups : (o.groups ? Object.values(o.groups).flat() : []);
        const newPages = Array.isArray(n.groups) ? n.groups : (n.groups ? Object.values(n.groups).flat() : []);
        // Treat empty/blank (and null/undefined) page entries as "no page" so
        // that chapters with no images don't produce spurious page diffs like
        // "1 -> 1 (+1 page, -1 page)".
        const isBlankPage = (p) => {
          if (p === null || p === undefined) return true;
          if (typeof p !== 'string') return false;
          const s = p.trim().toLowerCase();
          return s === '' || s === 'null' || s === 'undefined';
        };
        const oldReal = [...new Set(oldPages.filter(p => !isBlankPage(p)).map(String))];
        const newReal = [...new Set(newPages.filter(p => !isBlankPage(p)).map(String))];
        const oldSet = new Set(oldReal);
        const newSet = new Set(newReal);
        const addedCount = newReal.filter(p => !oldSet.has(p)).length;
        const removedCount = oldReal.filter(p => !newSet.has(p)).length;
        const pagesChanged = oldReal.length !== newReal.length || addedCount > 0 || removedCount > 0;
        if (pagesChanged) {
          const parts = [];
          if (addedCount > 0) parts.push('+' + addedCount + ' page' + (addedCount === 1 ? '' : 's'));
          if (removedCount > 0) parts.push('-' + removedCount + ' page' + (removedCount === 1 ? '' : 's'));
          changes.push('- pages: ' + oldReal.length);
          changes.push('+ pages: ' + newReal.length + (parts.length > 0 ? ' (' + parts.join(', ') + ')' : ''));
        }
        if (changes.length > 0) {
          entries.push({ title: 'Chapter ' + k, diff: changes.join('\n') });
        }
      });

      // Metadata
      const metaFields = ['title', 'artist', 'author', 'cover', 'description'];
      const metaChanges = [];
      metaFields.forEach(f => {
        if (oldSeries[f] !== newSeries[f]) {
          metaChanges.push('- ' + f + ': "' + (oldSeries[f] || '') + '"');
          metaChanges.push('+ ' + f + ': "' + (newSeries[f] || '') + '"');
        }
      });
      if (metaChanges.length > 0) {
        entries.push({ title: 'Metadata', diff: metaChanges.join('\n') });
      }

      return entries.length > 0 ? entries : null;
    },
    // The commit already exists locally; retrying with force overwrites the
    // remote branch so the session is not stuck behind a rejected push.
    forcePush(onSuccess, successMessage) {
      this.loadingStatus = 'Force pushing';
      this.loading = true;
      return GitHubUtils.pushForce(this.fs, this.username, this.pat).then(() => {
        this.loading = false;
        this.loadingStatus = '';
        if (onSuccess) {
          try {
            onSuccess();
          } catch (e) {
            console.error(e);
          }
        }
        this.$message.success(successMessage);
      }).catch(err => {
        console.error(err);
        this.loading = false;
        this.loadingStatus = '';
        this.$message.error('Force push failed: ' + (err && err.message ? err.message : 'unknown error'));
      });
    },
    postSaveSeries(name, series) {
      const diffEntries = this.computeSeriesDiff(this.originalSeries, series);
      this.rememberSavedSeries(name, series);
      this.originalSeries = JSON.parse(JSON.stringify(series));
      this.dirty = false;
      const embeds = [];
      if (diffEntries) {
        diffEntries.forEach(entry => {
          embeds.push(DiscordWebhook.buildEntryEmbed(entry.title, entry.diff, 0x5e6ad2, series));
        });
      }
      // Always include a summary embed with counts.
      embeds.unshift(DiscordWebhook.buildSummaryEmbed(series, 'save'));
      DiscordWebhook.sendAll(this.discordWebhook, embeds).catch(err => console.error('Discord webhook failed:', err));
    },
    goToChapter(key, chapter) {
      this.chapterKey = key;
      this.saveChapterScroll();
      // Edit a detached copy so "Discard" really discards.
      this.chapter = chapter
        ? new Chapter(
          chapter.title,
          chapter.volume,
          chapter.last_updated,
          JSON.parse(JSON.stringify(chapter.groups || {}))
        )
        : null;
      this.page = this.CHAPTER_EDITOR_PAGE;
      this.dirty = true;
    },
    discardChapter() {
      this.page = this.CHAPTER_MANAGER_PAGE;
      this.restoreChapterScroll();
      this.dirty = false;
    },
    saveChapter(key, chapter) {
      this.selectedSeries.chapters[key] = chapter;
      this.page = this.CHAPTER_MANAGER_PAGE;
      this.restoreChapterScroll();
    },
    // Remember where the chapter table was when opening the editor: the list
    // is recreated on every page switch, so the document otherwise restarts
    // at the top and the user loses their place in a long table.
    saveChapterScroll() {
      this.chapterScroll = {
        x: window.scrollX,
        y: window.scrollY,
        tableTop: this.chapterTableTop()
      };
    },
    restoreChapterScroll() {
      let saved = this.chapterScroll;
      this.chapterScroll = null;
      if (!saved) {
        return;
      }
      this.$nextTick(() => {
        const currentTop = this.chapterTableTop();
        let top = saved.tableTop === null || currentTop === null ? 0 : currentTop - saved.tableTop;
        window.scrollTo(saved.x, Math.max(0, Math.min(saved.y + top, this.maxScrollY())));
      });
    },
    chapterTableTop() {
      const table = this.$refs.manager && this.$refs.manager.$el
          ? this.$refs.manager.$el.querySelector('.table-wrap')
          : null;
      return table ? table.getBoundingClientRect().top + window.scrollY : null;
    },
    maxScrollY() {
      const doc = document.documentElement;
      return Math.max(0, (doc.scrollHeight || 0) - window.innerHeight);
    },
    onBeforeUnload(event) {
      if (this.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    },
    displayLoader(msg) {
      this.loading = true;
      this.loadingStatus = msg;
    },
    finishLoader() {
      this.loading = false;
      this.loadingStatus = '';
    },
    dismissLoader() {
      this.loading = false;
      this.loadingStatus = '';
      this.$message.warning('Operation cancelled.');
    }
  },
  mounted() {
    if (process.env.NODE_ENV === 'development') {
      document.title = 'facaccimo (dev)';
    }
    window.addEventListener('beforeunload', this.onBeforeUnload);
    CorsProxy.isAvailable().then(value => {
      if (!value) {
        this.$dialog.warning({
          title: 'CORS proxy not available',
          content: 'The CORS proxy at ' + CorsProxy.getProxyUrl() + ' is not reachable. Start it with "npm run proxy" and reload the page.',
          positiveText: 'OK',
        });
      } else if (process.env.NODE_ENV === 'development') {
        this.$message.success('CORS proxy is available');
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  },

  data: function () {
    return {
      HOME_PAGE: 'home',
      SERIES_MANAGER_PAGE: 'seriesManager',
      CHAPTER_MANAGER_PAGE: 'chapterManager',
      CHAPTER_EDITOR_PAGE: 'chapterEditor',
      page: 'home',
      email: '',
      discordWebhook: '',
      pat: '',
      username: '',
      repoName: '',
      fileName: '',
      chapterKey: '',
      chapter: null,
      chapterScroll: null,
      dirty: false,
      loadingTimer: null,
      loading: false,
      loadingStatus: '',
      fs: null,
      series: [],
      selectedSeries: null,
      originalSeries: null,
    }
  }
}
</script>

<style>
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--hair);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(6, 7, 8, .72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .loading-overlay .card { text-align: center; }
  .loading-dismiss {
    margin-top: 12px;
    background: var(--surface-2);
    border: 1px solid var(--hair);
    color: var(--ink);
    border-radius: 7px;
    padding: 6px 14px;
    cursor: pointer;
    font-size: 13px;
  }
  .loading-dismiss:hover { background: var(--surface-3); }
</style>
