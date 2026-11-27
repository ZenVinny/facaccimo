<template>
  <div>
    <div v-if="loading" class="loading-text">Loading repositories...</div>
    <div v-else>
      <div class="field">
        <label class="label">Select a repository</label>
        <div class="control">
          <input class="input" v-model="repo" placeholder="Choose repository" role="combobox"
                 aria-expanded="true" aria-haspopup="listbox" @focus="openDropdown" @keydown.esc="showDropdown = false">
        </div>
        <div v-if="filteredDataObj.length > 0" class="dropdown-list" role="listbox">
          <div v-for="option in filteredDataObj" :key="option.full_name"
               class="dropdown-item" @click="selectRepo(option)">
            {{ option.full_name }}
          </div>
        </div>
        <div v-else-if="repo" class="dropdown-empty">No repositories found</div>
      </div>
    </div>
  </div>
</template>

<script>
import GitHubUtils from "@/GitHubUtils";

export default {
  name: 'RepoList',
  props: {
    username: { type: String, default: '' },
    pat: { type: String, default: '' }
  },
  data: function () {
    return {
      repo: '',
      repos: [],
      loading: true,
      showDropdown: false
    }
  },
  computed: {
    filteredDataObj() {
      if (!this.showDropdown) return [];
      return this.repos.filter(option => {
        const name = option && option.full_name != null ? String(option.full_name) : '';
        return name.toLowerCase().indexOf(this.repo.toLowerCase()) >= 0;
      })
    }
  },
  methods: {
    selectRepo(option) {
      if (!option || option.full_name == null) return;
      this.repo = String(option.full_name);
      this.showDropdown = false;
      this.$emit('repo-selected', option);
    },
    openDropdown() {
      this.showDropdown = true;
    }
  },
  beforeMount() {
    this._alive = true;
    GitHubUtils.getAllRepos(this.username, this.pat).then(repos => {
      if (!this._alive) return;
      this.repos = Array.isArray(repos) ? repos : [];
      this.loading = false;
      if (this.repos.length === 0) {
        this.$message.warning('No repositories found for this account.');
      }
    }).catch(error => {
      if (!this._alive) return;
      this.loading = false;
      this.$message.error('Failed to load repositories: ' + (error && error.message ? error.message : 'unknown error'));
    });
  },
  mounted() {
    this._alive = true;
    this._outsideClick = (e) => {
      if (this.showDropdown && this.$el && !this.$el.contains(e.target)) {
        this.showDropdown = false;
      }
    };
    document.addEventListener('click', this._outsideClick);
  },
  beforeUnmount() {
    this._alive = false;
    if (this._outsideClick) {
      document.removeEventListener('click', this._outsideClick);
    }
  }
}
</script>

<style scoped>
  .loading-text {
    color: var(--ink-2);
    padding: 8px 0;
  }
  .dropdown-list {
    max-height: 260px;
    overflow-y: auto;
    border: 1px solid var(--hair);
    border-radius: 7px;
    margin-top: 4px;
    background: var(--surface-2);
  }
  .dropdown-item {
    padding: 8px 10px;
    cursor: pointer;
    color: var(--ink-2);
    font-size: 13.5px;
  }
  .dropdown-item:hover {
    background: var(--surface-3);
    color: var(--ink);
  }
  .dropdown-empty {
    padding: 8px 10px;
    color: var(--ink-3);
    font-size: 13.5px;
  }
</style>
