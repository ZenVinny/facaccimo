<template>
  <div>
    <!-- MangaBaka modal -->
    <div v-if="isSearching" class="modal-overlay" @click.self="isSearching = false">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">MangaBaka · {{ mbQuery }}<span v-if="mbTotal" class="mb-total"> ({{ mbTotal }} total)</span></p>
        </header>
        <section class="modal-card-body">
          <p v-if="mbLoading" class="mb-muted">Loading…</p>
          <template v-else>
            <p v-if="mbResults.length === 0" class="mb-muted">No matches found.</p>
            <button v-for="result in mbResults" :key="result.id" class="mb-item"
                    @click="pickMangaBaka(result)">
              <span class="mb-title">{{ result.title }}</span>
              <span class="mb-meta">{{ [result.type, result.year, result.status].filter(Boolean).join(' · ') }}</span>
            </button>
          </template>
        </section>
        <footer class="modal-card-foot">
          <button class="btn-cancel" @click="isSearching = false">Cancel</button>
        </footer>
      </div>
    </div>

    <!-- MangaDex modal -->
    <div v-if="isCoverSearching" class="modal-overlay" @click.self="closeCoverSearch">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">MangaDex {{ mdMode === 'chapters' ? 'chapters' : 'covers' }} · {{ mdQuery }}</p>
        </header>
        <section class="modal-card-body">
          <p v-if="mdLoading" class="mb-muted">Loading…</p>
          <template v-else>
            <p v-if="mdResults.length === 0" class="mb-muted">No matches found.</p>
            <button v-for="result in mdResults" :key="result.id" class="mb-item"
                    @click="pickMangaDexCover(result)" :disabled="mdMode === 'cover' && !result.coverUrl">
              <span v-if="mdMode === 'cover' && result.coverUrl && mdCoverUrls[result.id]" class="md-thumb-wrap">
                <img :src="mdCoverUrls[result.id]" alt="" class="md-thumb">
              </span>
              <span v-else-if="mdMode === 'cover' && result.coverUrl" class="md-thumb md-thumb-placeholder">…</span>
              <span class="mb-text">
                <span class="mb-title">{{ result.title }}</span>
                <span class="mb-meta">{{ [result.year, result.status].filter(Boolean).join(' · ') }}</span>
              </span>
            </button>
          </template>
        </section>
        <footer class="modal-card-foot">
          <button class="btn-cancel" @click="closeCoverSearch">Cancel</button>
        </footer>
      </div>
    </div>

    <div>
      <div class="column">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Overview
            </p>
            <div class="buttons">
              <button class="btn-primary" @click="openMangaBaka">
                Fetch metadata
              </button>
              <button class="btn-danger" @click="discard">Discard</button>
              <button class="btn-success" @click="save">Save</button>
            </div>
          </header>
          <div class="card-content">
            <div class="content">
              <section>
                <div class="field">
                  <label class="label">Title</label>
                  <div class="control">
                    <input class="input" v-model="series.title">
                  </div>
                </div>
                <div class="field is-grouped">
                  <div class="field" style="flex: 1;">
                    <label class="label">Artist</label>
                    <div class="control">
                      <input class="input" v-model="series.artist">
                    </div>
                  </div>
                  <div class="field" style="flex: 1;">
                    <label class="label">Author</label>
                    <div class="control">
                      <input class="input" v-model="series.author">
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label class="label">Description</label>
                  <div class="control">
                    <textarea class="textarea" v-model="series.description"></textarea>
                  </div>
                </div>
                <div class="field is-grouped">
                  <div class="field" style="flex: 1;">
                    <label class="label">Cover URL</label>
                    <div class="control">
                      <input class="input" v-model="series.cover">
                    </div>
                  </div>
                  <div class="control" style="align-self: flex-end;">
                    <button class="btn-primary" @click="openMangaDex('cover')">Fetch cover</button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="column">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Chapters
            </p>
          </header>
          <div class="card-content">
            <div class="content">
              <div class="has-text-right" style="margin-bottom: 12px;">
                <button class="btn-primary" @click="openMangaDex('chapters')">Fetch chapters</button>
                <button class="btn-primary" :disabled="checkedRows.length === 0" @click="groupEdit()">Group edit volume</button>
                <button class="btn-danger" :disabled="checkedRows.length === 0" @click="deleteSelected()">Delete selected<span v-if="checkedRows.length"> ({{ checkedRows.length }})</span></button>
                <button class="btn-primary" @click="addNewChapter()">Add new chapter</button>
                <button class="btn-primary" @click="batchCreateChapters()">Batch create</button>
              </div>
            <div class="table-wrap">
              <table class="chapter-table">
              <thead>
                <tr>
                  <th class="select-cell">
                    <input type="checkbox"
                           :checked="allSelected"
                           :indeterminate.prop="someSelected"
                           @change="toggleAll"
                           aria-label="Select all chapters">
                  </th>
                  <th>Chapter number</th>
                  <th>Title</th>
                  <th>Volume</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="chapter in sortedChapters" :key="chapter">
                  <td class="select-cell">
                    <input type="checkbox"
                           :checked="isChecked(chapter)"
                           @change="toggleRow(chapter)"
                           :aria-label="'Select chapter ' + chapter">
                  </td>
                  <td>{{ chapter }}</td>
                  <td>{{ series.chapters[chapter].title }}</td>
                  <td>{{ series.chapters[chapter].volume }}</td>
                  <td>{{ ''+new Date(series.chapters[chapter].getLastUpdated()).toLocaleDateString() }}</td>
                  <td>
                    <div class="buttons">
                      <button class="btn-primary" @click="editChapter(chapter)">Edit</button>
                      <button class="btn-danger" @click="confirmDelete(chapter)">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
              </div>
              <div v-if="sortedChapters.length === 0" class="has-text-centered">No chapters</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Series from "@/model/Series";
import Chapter from "@/model/Chapter";
import Groups from "@/model/Groups";
import GDrive from "@/GDrive";
import MangaBaka from "@/model/MangaBaka";
import MangaDex from "@/model/MangaDex";
import CorsProxy from "@/CorsProxy";

// Guard against a typo in the batch range locking up the tab.
const MAX_BATCH = 500;

export default {
  name: 'ChapterManager',
  data: function () {
    return {
      checkedRows: [],
      isSearching: false,
      mbLoading: false,
      mbQuery: '',
      mbResults: [],
      mbTotal: 0,
      isCoverSearching: false,
      mdLoading: false,
      mdQuery: '',
      mdResults: [],
      mdCoverUrls: {},
      mdMode: 'cover'
    }
  },
  computed: {
    sortedChapters() {
      return Object.keys(this.series.chapters).sort(this.compareChapterNames);
    },
    allSelected() {
      return this.sortedChapters.length > 0 && this.checkedRows.length === this.sortedChapters.length;
    },
    someSelected() {
      return this.checkedRows.length > 0 && this.checkedRows.length < this.sortedChapters.length;
    }
  },
  methods: {
    openMangaBaka() {
      const query = (this.series.title || this.name || '').replace(/\.json$/i, '').trim();
      if (!query) {
        this.$message.warning('Set a title first');
        return;
      }
      this.mbQuery = query;
      this.mbResults = [];
      this.isSearching = true;
      this.mbLoading = true;
      MangaBaka.search(query)
          .then(({ results, total }) => {
            this.mbResults = results;
            this.mbTotal = total;
          })
          .catch(error => {
            this.$message.error('MangaBaka search failed: ' + error.message);
          })
          .then(() => {
            this.mbLoading = false;
          });
    },
    pickMangaBaka(result) {
      this.mbLoading = true;
      MangaBaka.getSeries(result.id)
          .then(series => {
            const title = MangaBaka.title(series);
            if (title) {
              this.series.title = title;
            }
            const artists = (series.artists || []).join(', ');
            if (artists) {
              this.series.artist = artists;
            }
            const authors = (series.authors || []).join(', ');
            if (authors) {
              this.series.author = authors;
            }
            this.series.description = MangaBaka.applyMeta(series.description, MangaBaka.tags(series), series.status);
            this.isSearching = false;
            this.$message.success('Metadata imported from MangaBaka!');
          })
          .catch(error => {
            this.$message.error('Could not load series: ' + error.message);
          })
          .then(() => {
            this.mbLoading = false;
          });
    },
    openMangaDex(mode) {
      this.mdMode = mode || 'cover';
      Object.values(this.mdCoverUrls).forEach(url => URL.revokeObjectURL(url));
      this.mdCoverUrls = {};
      const query = (this.series.title || this.name || '').replace(/\.json$/i, '').trim();
      if (!query) {
        this.$message.warning('Set a title first');
        return;
      }
      this.mdQuery = query;
      this.mdResults = [];
      this.isCoverSearching = true;
      this.mdLoading = true;
      MangaDex.search(query)
          .then(results => {
            this.mdResults = results;
            if (this.mdMode === 'cover') {
              results.forEach(result => {
                if (!result.coverUrl) return;
                CorsProxy.get(result.coverUrl, { 'User-Agent': 'facaccimo/1.0 (local tool)' })
                    .then(response => {
                      if (!response.ok) throw new Error('HTTP ' + response.status);
                      return response.blob();
                    })
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      this.mdCoverUrls[result.id] = url;
                    })
                    .catch(() => { /* leave placeholder */ });
              });
            }
          })
          .catch(error => {
            this.$message.error('MangaDex search failed: ' + error.message);
          })
          .then(() => {
            this.mdLoading = false;
          });
    },
    async pickMangaDexCover(result) {
      if (this.mdMode === 'chapters') {
        const ok = await this.$confirm({
          title: 'Fetch chapters',
          content: 'Fetch chapters from ' + result.title + '? Existing chapters will not be overwritten.',
          positiveText: 'Fetch'
        });
        if (!ok) return;
        this.$emit('loading', 'Fetching chapters from MangaDex');
        MangaDex.getChapters(result.id)
            .then(chapters => {
              let added = 0;
              for (const ch of chapters) {
                if (!this.series.chapters[ch.number]) {
                  this.series.chapters[ch.number] = new Chapter(ch.title, ch.volume, ch.lastUpdated, { "": [""] });
                  added++;
                }
              }
              this.$emit('loaded');
              this.isCoverSearching = false;
              this.$message.success(added + ' new chapter(s) added from MangaDex!');
            })
            .catch(error => {
              this.$emit('loaded');
              this.$message.error('Failed to fetch chapters: ' + error.message);
            });
        return;
      }
      if (!result.coverUrl) {
        this.$message.warning('No cover available for this result');
        return;
      }
      this.series.cover = result.coverUrl;
      this.revokeCoverUrls();
      this.isCoverSearching = false;
      this.$message.success('Cover URL set from MangaDex!');
    },
    isChecked(key) {
      return this.checkedRows.indexOf(key) !== -1;
    },
    toggleRow(key) {
      const index = this.checkedRows.indexOf(key);
      if (index === -1) {
        this.checkedRows.push(key);
      } else {
        this.checkedRows.splice(index, 1);
      }
    },
    toggleAll(event) {
      this.checkedRows = event.target.checked ? this.sortedChapters.slice() : [];
    },
    async groupEdit() {
      const value = await this.$prompt({
        title: 'Set volume',
        text: 'Volume for ' + this.checkedRows.length + ' selected chapter(s).',
        placeholder: 'e.g. 3',
        positiveText: 'Apply'
      });
      if (value === null) return;
      this.checkedRows.forEach(e => {
        this.series.chapters[e].volume = value;
      });
      this.checkedRows = [];
      this.$message.success('Volume set!');
    },
    deleteChapter(number) {
      delete this.series.chapters[number];
      this.checkedRows = this.checkedRows.filter(key => key !== number);
      this.$message.success('Chapter deleted!')
    },
    async confirmDelete(number) {
      const ok = await this.$confirm({
        title: 'Delete chapter ' + number,
        content: 'This removes the chapter and its links from the series.',
        positiveText: 'Delete',
        type: 'error'
      });
      if (!ok) return;
      this.deleteChapter(number);
    },
    // Batch version of confirmDelete for every chapter ticked in the table.
    async deleteSelected() {
      const keys = this.checkedRows.slice();
      if (keys.length === 0) {
        return;
      }
      const label = keys.length === 1 ? 'chapter' : 'chapters';
      const preview = keys.slice(0, 10).join(', ') + (keys.length > 10 ? ', …' : '');
      const ok = await this.$confirm({
        title: 'Delete ' + keys.length + ' ' + label,
        content: 'Remove ' + label + ' ' + preview + ' and their links from this series? Nothing is written to GitHub until you press Save.',
        positiveText: 'Delete ' + keys.length,
        negativeText: 'Cancel',
        type: 'error'
      });
      if (!ok) {
        return;
      }
      keys.forEach(key => {
        delete this.series.chapters[key];
      });
      this.checkedRows = [];
      this.$message.success(keys.length + ' ' + label + ' deleted. Press Save to keep the change.');
    },
    editChapter(number) {
      let lastVolume = '';
      let lastGroup = '';
      let keys = Object.keys(this.series.chapters);
      if (keys.length > 0) {
        let lastChapter = this.series.chapters[keys[keys.length - 1]];
        lastVolume = lastChapter.volume;
        lastGroup = Groups.getGroupName(lastChapter.groups);
      }
      this.$emit('chapter', number, this.series.chapters[number] ?? new Chapter(number, lastVolume, null, Groups.getImagesGroup(lastGroup, '')));
    },
    async addNewChapter() {
      let key = '';
      let keys = this.sortedChapters;
      if (keys.length > 0) {
        let lastKey = keys[0];
        if (!isNaN(+lastKey)) {
          key = +lastKey + 1;
        }
      }
      const value = await this.$prompt({
        title: 'New chapter',
        text: 'Chapter number',
        defaultValue: key + '',
        positiveText: 'Create',
        validate: value => {
          const trimmed = String(value).trim();
          if (trimmed === '') {
            return 'Chapter number cannot be empty';
          }
          if (Object.prototype.hasOwnProperty.call(this.series.chapters, trimmed)) {
            return 'Chapter ' + trimmed + ' already exists';
          }
          return null;
        }
      });
      if (value !== null) {
        this.editChapter(value.trim());
      }
    },
    async batchCreateChapters() {
      const numbers = this.sortedChapters.map(Number).filter(n => !isNaN(n));
      const highest = numbers.length ? numbers.reduce((a, b) => Math.max(a, b), 0) : 0;
      const next = String(highest + 1);

      const values = await this.$promptPair({
        title: 'Batch create chapters',
        text: 'Creates an empty chapter for every whole number in the range. Existing chapters are left untouched.',
        fields: [
          { key: 'from', label: 'From', placeholder: '1', defaultValue: '1' },
          { key: 'to', label: 'To', placeholder: next, defaultValue: next }
        ],
        positiveText: 'Create',
        validate: range => {
          const from = Number(range.from);
          const to = Number(range.to);
          if (!Number.isInteger(from) || from < 1) {
            return 'Start must be a whole number of 1 or more';
          }
          if (!Number.isInteger(to) || to < from) {
            return 'End must be a whole number, at least the start';
          }
          if (to - from + 1 > MAX_BATCH) {
            return 'That is more than ' + MAX_BATCH + ' chapters at once \u2014 use a smaller range';
          }
          return null;
        }
      });
      if (!values) return;

      const from = Number(values.from);
      const to = Number(values.to);
      let added = 0;
      for (let i = from; i <= to; i++) {
        const key = String(i);
        if (!this.series.chapters[key]) {
          this.series.chapters[key] = new Chapter('', '', null, { "": [""] });
          added++;
        }
      }
      this.$message.success(added + ' chapter(s) created!');
    },
    async discard() {
      const ok = await this.$confirm({
        title: 'Discard changes?',
        content: 'All unsaved edits to this series will be lost.',
        positiveText: 'Discard',
        negativeText: 'Keep editing',
        type: 'warning'
      });
      if (!ok) return;
      this.$emit('discard');
    },
    save() {
      this.$emit('save', this.name, this.series);
    },
    revokeCoverUrls() {
      Object.values(this.mdCoverUrls).forEach(url => URL.revokeObjectURL(url));
      this.mdCoverUrls = {};
    },
    closeCoverSearch() {
      this.revokeCoverUrls();
      this.isCoverSearching = false;
    },
    compareChapterNames(a, b, isAsc = false) {
      if (a === b || isNaN(+a) || isNaN(+b)) {
        return 0;
      }
      if (isAsc) {
        return (+a) - (+b);
      }
      return (+b) - (+a);
    }
  },
  beforeUnmount() {
    this.revokeCoverUrls();
  },
  props: {
    series: Object,
    name: String
  }
}
</script>

<style scoped>
  /* ... (keeping existing styles) */
</style>
