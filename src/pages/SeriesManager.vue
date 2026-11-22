<template>
  <div class="series">
    <div class="toolbar">
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6"/>
          <path d="M16 16l4 4"/>
        </svg>
        <input v-model="query" type="search" placeholder="Search series" aria-label="Search series" autocomplete="off">
      </label>
      <button class="primary" @click="addNewSeries()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        <span class="lbl">New series</span>
      </button>
    </div>

    <table class="list">
      <caption class="sr-only">Series list</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th class="num" scope="col">Chapters<small>volumes</small></th>
          <th class="acts-col" scope="col">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredSeries" :key="item.name">
          <td>
            <div class="cell">
              <div class="txt">
                <div class="nm">{{ item.data.title || item.name }}</div>
                <div class="fn">{{ item.name }}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="cn">
              <span class="cnum" :class="{ zero: chapterCount(item) === 0 }">{{ chapterCount(item) }}</span>
              <span class="vol" :class="{ empty: volumeCount(item) === 0 }">
                {{ volumeCount(item) ? volumeCount(item) + ' vol' : '—' }}
              </span>
            </div>
          </td>
          <td>
            <div class="acts">
              <button class="ib" aria-label="Cubari link" @click="showUrl(item.name)">
                <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
              </button>
              <button class="ib" aria-label="Edit" @click="goToSeries(item.name)">
                <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z"/></svg>
              </button>
              <button class="ib d" aria-label="Delete" @click="confirmDelete(item.name)">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="filteredSeries.length === 0">
          <td colspan="3">
            <div class="no-results">{{ series.length === 0 ? 'No files yet.' : 'No series match that search.' }}</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: "SeriesManager",
  data: function() {
    return {
      query: ""
    };
  },
  computed: {
    filteredSeries() {
      const sorted = this.series.slice().sort((a, b) => {
        const an = (a.data && a.data.title) || a.name || '';
        const bn = (b.data && b.data.title) || b.name || '';
        return an.localeCompare(bn, undefined, { sensitivity: 'base' });
      });
      const term = this.query.trim().toLowerCase();
      if (!term) {
        return sorted;
      }
      return sorted.filter(item => {
        const haystack = (item.name + " " + (item.data.title || "")).toLowerCase();
        return haystack.indexOf(term) !== -1;
      });
    },
  },
  methods: {
    chapterCount(item) {
      const chapters = (item && item.data && item.data.chapters) || {};
      return Object.keys(chapters).length;
    },
    volumeCount(item) {
      const chapters = (item && item.data && item.data.chapters) || {};
      const volumes = new Set();
      for (const key of Object.keys(chapters)) {
        const volume = String((chapters[key] && chapters[key].volume) ?? "").trim();
        if (volume) {
          volumes.add(volume);
        }
      }
      return volumes.size;
    },
    async confirmDelete(fileName) {
      const ok = await this.$confirm({
        title: 'Delete series',
        content: 'Delete ' + fileName + '? This cannot be undone.',
        positiveText: 'Delete',
        type: 'error'
      });
      if (!ok) return;
      this.$emit("delete", fileName);
    },
    showUrl(fileName) {
      this.$emit("show", fileName);
    },
    async addNewSeries() {
      const name = await this.$prompt({
        title: 'New series',
        text: 'File name for the new series',
        placeholder: 'e.g. My-Series.json',
        positiveText: 'Create'
      });
      if (name) {
        this.goToSeries(name);
      }
    },
    goToSeries(name) {
      name = String(name || "").trim().replace(/\s+/g, "-");
      if (!name) {
        this.$message.warning('File name cannot be empty');
        return;
      }
      if (!name.toLowerCase().endsWith(".json")) {
        name = name + ".json";
      }
      this.$emit("series", name);
    },
  },
  props: {
    series: Array,
  },
};
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0 12px;
  border-bottom: 1px solid var(--hair);
}
.search {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}
.search svg {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--ink-3);
  stroke-width: 1.8;
  stroke-linecap: round;
  pointer-events: none;
}
.search input {
  width: 100%;
  height: 44px;
  background: #0e1013;
  border: 1px solid var(--hair);
  border-radius: 7px;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  padding: 0 12px 0 36px;
}
.search input::placeholder { color: #6f7780; }
.search input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.primary:hover { background: var(--accent-hi); }
.primary:focus-visible { outline: 2px solid var(--accent-hi); outline-offset: 2px; }
.primary svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.list {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.list th {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  text-align: left;
  padding: 12px 8px 11px 4px;
  border-bottom: 1px solid var(--hair);
}
.list th.num {
  width: 84px;
  text-align: right;
  padding-right: 14px;
  line-height: 1.35;
}
.list th.num small {
  display: block;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--ink-3);
}
.list th.acts-col { width: 152px; }
.list td {
  padding: 0;
  border-bottom: 1px solid var(--hair-2);
}
.list tbody tr:hover td { background: var(--surface); }
.cell {
  display: flex;
  align-items: center;
  padding: 12px 8px 12px 4px;
  min-height: 68px;
  min-width: 0;
}
.txt { min-width: 0; }
.nm {
  font-size: 15.5px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fn {
  font-size: 12.5px;
  color: var(--ink-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.cn {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
  min-height: 68px;
  padding: 0 12px 0 8px;
}
.cnum {
  font-size: 15px;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.cnum.zero { color: var(--warn); }
.vol {
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.vol.empty { color: var(--ink-3); }
.acts {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  min-height: 68px;
  padding: 12px 2px 12px 0;
}
.ib {
  width: 46px;
  height: 46px;
  border: 1px solid var(--hair);
  background: #101214;
  border-radius: 8px;
  color: #9aa3ad;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.ib:hover { background: var(--surface-2); border-color: #343a42; color: var(--ink); }
.ib.d:hover { color: #ef6d5a; background: #241a19; border-color: #3d2622; }
.ib:focus-visible { outline: 2px solid var(--accent-hi); outline-offset: 2px; }
.ib svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.no-results { padding: 26px 6px; color: var(--ink-3); font-size: 13.5px; text-align: center; }

@media (max-width: 430px) {
  .primary { padding: 0 12px; }
  .primary .lbl { display: none; }
  .list th.num { width: 72px; padding-right: 8px; }
  .list th.acts-col { width: 138px; }
  .cn { padding-right: 6px; }
  .ib { width: 42px; height: 42px; }
  .ib svg { width: 19px; height: 19px; }
}
@media (max-width: 360px) {
  .list th.num { width: 68px; }
}
</style>
