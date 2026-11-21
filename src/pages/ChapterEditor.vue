<template>
  <div>
    <div class="modal-overlay" v-if="isImporting" @click.self="isImporting = false">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Import</p>
        </header>
        <section class="modal-card-body">
          <div v-if="importType === IMPORT_TYPE_REDDIT">
            Paste URL to Reddit Post
            <p class="is-italic">You can include multiple posts by pasting multiple URLs in separate lines</p>
          </div>
          <div v-else-if="importType === IMPORT_TYPE_GDRIVE">
            Paste URL to Google Drive shared image
            <p class="is-italic">You can include multiple images by pasting multiple URLs in separate lines</p>
          </div>
          <div v-else-if="importType === IMPORT_TYPE_IMGUR">
            Paste URL to Imgur album
            <p class="is-italic">You can include multiple albums by pasting multiple URLs in separate lines</p>
          </div>
          <div class="field">
            <div class="control">
              <textarea class="textarea" v-model="importContent"></textarea>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="btn-cancel" @click="isImporting = false">Cancel</button>
          <button class="btn-primary" @click="finishImport()">Import</button>
        </footer>
      </div>
    </div>

    <div>
      <div class="column">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Chapter
            </p>
            <div class="buttons">
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
                    <input class="input" v-model="chapter.title">
                  </div>
                </div>
                <div class="field is-grouped">
                  <div class="field" style="flex: 1;">
                    <label class="label">Volume</label>
                    <div class="control">
                      <input class="input" type="number" v-model="chapter.volume">
                    </div>
                  </div>
                  <div class="field" style="flex: 1;">
                    <label class="label">Last updated</label>
                    <div class="control">
                      <input class="input" type="datetime-local" v-model="datetimeLocal">
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label class="label">Group name</label>
                  <div class="control">
                    <input class="input" v-model="groupName">
                  </div>
                </div>
                <div class="field">
                  <label class="checkbox">
                    <input type="checkbox" v-model="isProxy">
                    Proxy
                  </label>
                </div>
                <div v-if="isProxy" class="field">
                  <label class="label">Chapter URL</label>
                  <div class="control">
                    <input class="input" v-model="pages" @input="onProxyUrlChange">
                  </div>
                  <p class="help">Paste MangaDex/MangaSee/Imgur/MangaKatana URL above and it should be automatically turned into <code>/proxy/api/</code> URL</p>
                </div>
                <div v-else class="field">
                  <label class="label">List of image URLs</label>
                  <div class="control">
                    <textarea class="textarea" v-model="pages"></textarea>
                  </div>
                  <div class="has-text-right" style="margin-top: 8px;">
                    <button class="btn-primary" @click="openRedditDialog">Reddit Gallery</button>
                    <button class="btn-primary" @click="openGDriveDialog">Google Drive</button>
                    <button class="btn-primary" @click="openImgurDialog">Imgur Album</button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Groups from "@/model/Groups";
import Reddit from "@/Reddit";
import GDrive from "@/GDrive";
import Imgur from "@/Imgur";
import Proxy from "@/model/Proxy";

export default {
  name: 'ChapterEditor',
  data: function () {
    return {
      IMPORT_TYPE_REDDIT: 'reddit',
      IMPORT_TYPE_GDRIVE: 'gdrive',
      IMPORT_TYPE_IMGUR: 'imgur',
      isProxy: false,
      pages: '',
      groupName: '',
      originalGroupName: '',
      datetime: new Date(),
      datetimeLocal: '',
      originalDatetimeLocal: '',
      isImporting: false,
      importType: null,
      importContent: ''
    }
  },
  beforeMount() {
    this.isProxy = Groups.isProxy(this.chapter.groups);
    this.pages = Groups.getPages(this.chapter.groups);
    this.groupName = Groups.getGroupName(this.chapter.groups);
    this.originalGroupName = Groups.getGroupName(this.chapter.groups);
    this.datetime = this.chapter.getLastUpdated();
    // Convert to datetime-local format
    const d = this.datetime;
    const pad = n => String(n).padStart(2, '0');
    this.datetimeLocal = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    this.originalDatetimeLocal = this.datetimeLocal;
  },
  methods: {
    async discard() {
      const ok = await this.$confirm({
        title: 'Discard changes?',
        content: 'All unsaved edits to this chapter will be lost.',
        positiveText: 'Discard',
        negativeText: 'Keep editing',
        type: 'warning'
      });
      if (!ok) return;
      this.$emit('discard');
    },
    save() {
      const dateChanged = this.datetimeLocal !== this.originalDatetimeLocal;
      if (dateChanged) {
        const date = new Date(this.datetimeLocal);
        if (isNaN(date.getTime())) {
          this.$message.error('Invalid date');
          return;
        }
        this.chapter.setLastUpdated(date);
      }
      const groups = Object.assign({}, this.chapter.groups);
      // '' is a valid group key (chapters created by batch create or imports),
      // so test for the key itself rather than for a truthy name.
      if (this.originalGroupName !== this.groupName &&
          Object.prototype.hasOwnProperty.call(groups, this.originalGroupName)) {
        delete groups[this.originalGroupName];
      }
      Object.assign(groups, Groups.getGroups(this.groupName, this.pages, this.isProxy));
      this.chapter.groups = groups;
      this.$emit('save', this.chapterKey, this.chapter);
    },
    openRedditDialog() {
      this.importType = this.IMPORT_TYPE_REDDIT;
      this.importContent = '';
      this.isImporting = true;
    },
    openGDriveDialog() {
      this.importType = this.IMPORT_TYPE_GDRIVE;
      this.importContent = '';
      this.isImporting = true;
    },
    openImgurDialog() {
      this.importType = this.IMPORT_TYPE_IMGUR;
      this.importContent = '';
      this.isImporting = true;
    },
    finishImport() {
      if (this.importType === this.IMPORT_TYPE_REDDIT) {
        this.parseReddit(this.importContent);
      } else if (this.importType === this.IMPORT_TYPE_GDRIVE) {
        this.parseGDrive(this.importContent);
      } else if (this.importType === this.IMPORT_TYPE_IMGUR) {
        this.parseImgur(this.importContent);
      }
      this.isImporting = false;
    },
    parseGDrive(urls, close) {
      if (GDrive.isGDriveUrl(urls)) {
        this.isImporting = false;
        try {
          this.pages += (this.pages.length === 0 ? '' : '\n') + GDrive.getImgArray(urls).join('\n');
        } catch (error) {
          this.$message.error(error && error.message ? error.message : 'Failed to read Google Drive URLs!');
        }
      } else {
        this.$message.error('URLs are not a valid Google Drive URLs!');
      }
    },
    parseReddit(urls, close) {
      if (Reddit.isRedditUrl(urls)) {
        this.isImporting = false;
        this.$emit('loading', 'Getting data from Reddit');
        Reddit.getImgArray(urls).then(result => {
          if (result.urls.length > 0) {
            this.pages += (this.pages.length === 0 ? '' : '\n') + result.urls.join('\n');
          }
          this.$emit('loaded');
          if (result.urls.length === 0) {
            this.$message.error('No images found in the pasted Reddit post(s).');
          } else if (result.failures.length > 0) {
            this.$message.warning(result.failures.length + ' of ' + result.attempted +
                ' Reddit post(s) could not be imported: ' + result.failures[0].message);
          }
        })
            .catch(error => {
              this.$emit('loaded');
              this.$message.error('Failed to parse Reddit Galleries! ' + (error && error.message ? error.message : 'Please try again later.'));
            });
      } else {
        this.$message.error('URLs are not a valid Reddit Posts!');
      }
    },
    parseImgur(urls, close) {
      if (Imgur.isImgurUrl(urls)) {
        this.isImporting = false;
        this.$emit('loading', 'Getting data from Imgur');
        Imgur.getImgArray(urls).then(value => {
          this.pages += (this.pages.length === 0 ? '' : '\n') + value.join('\n');
          this.$emit('loaded');
        })
            .catch(() => {
              this.$emit('loaded');
              this.$message.error('Failed to get images from Imgur! You can use the imgur proxy instead.');
            });
      } else {
        this.$message.error('URLs are not a valid Imgur albums!');
      }
    },
    onProxyUrlChange() {
      let proxy = Proxy.getProxyByUrl(this.pages);
      if (proxy) {
        this.pages = proxy.getProxyUrl(this.pages);
      }
    }
  },
  props: {
    chapter: Object,
    chapterKey: String
  }
}
</script>

<style scoped>
  .is-italic {
    font-style: italic;
    color: var(--ink-3);
    font-size: 12.5px;
  }
  code {
    background: #0e1013;
    color: var(--ink);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(4, 5, 7, .72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-card {
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: 12px;
    box-shadow: 0 30px 70px rgba(0, 0, 0, .6);
    color: var(--ink);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  .modal-card-head {
    padding: 14px 18px;
    border-bottom: 1px solid var(--hair);
  }
  .modal-card-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
  .modal-card-body {
    padding: 18px;
    color: var(--ink-2);
  }
  .modal-card-foot {
    padding: 14px 18px;
    border-top: 1px solid var(--hair);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .btn-cancel {
    background: var(--surface-2);
    border: 1px solid var(--hair);
    color: var(--ink);
    border-radius: 7px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13.5px;
  }
  .btn-primary {
    background: var(--accent);
    border: 0;
    color: #fff;
    border-radius: 7px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 500;
  }
  .btn-primary:hover { background: var(--accent-hi); }
  .btn-danger {
    background: var(--danger);
    border: 0;
    color: #fff;
    border-radius: 7px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13.5px;
  }
  .btn-success {
    background: #2f9e63;
    border: 0;
    color: #fff;
    border-radius: 7px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13.5px;
  }
</style>
