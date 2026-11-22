<template>
  <div class="section">
    <div class="column">
      <div class="card">
        <div class="card-content">
          <div class="content">
            <div v-if="step === 0">
              <p>I made this site to make managing cubari.moe repos easier to manage. This site is
                static and the code is
                open source.</p>
              <p>The source code is available on <a href="https://github.com/stirante/facaccimo">GitHub</a>.</p>
              <p>Additionally you can contact me on Discord (stirante).</p>
            </div>
            <p v-if="step === 1">Do you have a GitHub account?</p>
            <p v-if="step === 2">Create an account <a href="https://github.com/" target="_blank">here</a></p>
            <p v-if="step === 3">Do you have a Personal Access Token?</p>
            <div v-if="step === 4">
              <p>Create a Personal Access Token (or use existing one if already created) <a
                href="https://github.com/settings/tokens/new?scopes=repo,user:email&description=facaccimo"
                target="_blank">here</a>
              </p>
            </div>
            <div v-if="step === 5">
              <p>Fill your GitHub username and Personal Access Token</p>
              <div class="field">
                <label class="label">Username</label>
                <div class="control">
                  <input class="input" v-model="username" required placeholder="Username">
                </div>
              </div>
              <div class="field">
                <label class="label">Personal Access Token</label>
                <div class="control">
                  <input class="input" v-model="pat" required placeholder="Personal Access Token">
                </div>
              </div>
              <div class="field">
                <label class="label">Discord webhook URL (optional)</label>
                <div class="control">
                  <input class="input" v-model="discordWebhook" placeholder="https://discord.com/api/webhooks/...">
                </div>
                <p class="help">Paste a Discord channel webhook URL to get a notification on every save or delete. Leave blank to disable.</p>
              </div>
            </div>
            <p v-if="step === 6">Do you have a repository already?</p>
            <div v-if="step === 7">
              <p>Set the repository name</p>
              <div class="field">
                <label class="label">Repository name</label>
                <div class="control">
                  <input class="input" v-model="repoName" required placeholder="Repository name">
                </div>
              </div>
            </div>
            <div v-if="step === 8">
              <p>Select repository from the list</p>
              <RepoList :username="username" :pat="pat" @repo-selected="onRepoSelected"/>
            </div>
            <p v-if="step === 9">Do you want to save Personal Access Token and repository name for the future (using
              browser's Local Storage)?</p>
          </div>
        </div>
        <footer class="card-footer">
          <a v-if="step === 0 && saved" href="#" @click.prevent="goToManager()" class="card-footer-item">Load saved</a>
          <a v-if="actionType === ACTION_BEGIN" href="#" @click.prevent="nextStep()" class="card-footer-item">Begin</a>
          <a v-if="actionType === ACTION_NEXT" href="#" @click.prevent="nextStep()" class="card-footer-item">Next</a>
          <a v-if="actionType === ACTION_YES_NO" href="#" @click.prevent="nextStep(false)" class="card-footer-item">No</a>
          <a v-if="actionType === ACTION_YES_NO" href="#" @click.prevent="nextStep(true)" class="card-footer-item">Yes</a>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
import RepoList from "@/components/RepoList";
import GitHubUtils from "@/GitHubUtils";

export default {
  name: 'HomePage',
  components: {RepoList},
  data: function () {
    return {
      ACTION_BEGIN: 'begin',
      ACTION_NEXT: 'next',
      ACTION_YES_NO: 'yes_no',
      ACTION_NONE: 'none',
      step: 0,
      actionType: 'begin',
      username: '',
      pat: '',
      repoName: '',
      email: '',
      discordWebhook: '',
      saved: false,
    }
  },
  methods: {
    nextStep(value) {
      if (this.step === 0) {
        this.step = 1;
        this.actionType = this.ACTION_YES_NO;
      } else if (this.step === 1) {
        if (value) {
          this.step = 3;
          this.actionType = this.ACTION_YES_NO;
        } else {
          this.step = 2;
          this.actionType = this.ACTION_NEXT;
        }
      } else if (this.step === 2) {
        this.step = 1;
        this.actionType = this.ACTION_YES_NO;
      } else if (this.step === 3) {
        if (value) {
          this.step = 5;
          this.actionType = this.ACTION_NEXT;
        } else {
          this.step = 4;
          this.actionType = this.ACTION_NEXT;
        }
      } else if (this.step === 4) {
        this.step = 5;
        this.actionType = this.ACTION_NEXT;
      } else if (this.step === 5) {
        let target = this;
        this.$emit('loading', 'Checking token');
        GitHubUtils.getEmail(this.username, this.pat).then(email => {
          target.email = email;
          this.$emit('loaded');
          target.step = 6;
          target.actionType = this.ACTION_YES_NO;
        }).catch(() => {
          return GitHubUtils.getRepoList(this.username, this.pat)
              .then(async () => {
                this.$emit('loaded');
                const email = await this.$prompt({
                  title: 'Email for commits',
                  text: 'Provide the email address associated with commits (usually the same as your GitHub one).',
                  placeholder: 'user@example.org',
                  positiveText: 'Continue',
                  validate: value => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(value).toLowerCase())
                    ? null
                    : 'Invalid email address'
                });
                if (email) {
                  target.email = email;
                  target.step = 6;
                  target.actionType = this.ACTION_YES_NO;
                } else {
                  this.$emit('loaded');
                }
              })
              .catch(error => {
                this.$emit('loaded');
                const status = error && (error.status || (error.response && error.response.status));
                if (status === 401 || status === 403) {
                  this.$message.error('Invalid credentials!');
                } else {
                  this.$message.error('Could not reach GitHub: ' + (error && error.message ? error.message : 'unknown error'));
                }
              })
        })
      } else if (this.step === 6) {
        if (value) {
          this.step = 8;
          this.actionType = this.ACTION_NONE;
        } else {
          this.step = 7;
          this.actionType = this.ACTION_NEXT;
        }
      } else if (this.step === 7 || this.step === 8) {
        if (this.step === 7) {
          if (!this.repoName || !this.repoName.trim()) {
            this.$message.error('Repository name cannot be empty');
            return;
          }
          let target = this;
          this.$emit('loading', 'Creating repo');
          GitHubUtils.createRepo(this.username, this.pat, this.repoName).then(value1 => {
            target.repoName = value1.data.full_name;
            this.$emit('loaded');
            this.step = 9;
            this.actionType = this.ACTION_YES_NO;
          }).catch(err => {
            this.$emit('loaded');
            this.$message.error('Failed to create repository: ' + (err && err.message ? err.message : 'unknown error'));
          });
        } else {
          this.step = 9;
          this.actionType = this.ACTION_YES_NO;
        }
      } else if (this.step === 9) {
        if (value) {
          window.localStorage.setItem('pat', this.pat);
          window.localStorage.setItem('username', this.username);
          window.localStorage.setItem('repo', this.repoName);
          window.localStorage.setItem('email', this.email);
          window.localStorage.setItem('discordWebhook', this.discordWebhook);
        }
        this.goToManager();
      }
    },
    onRepoSelected: function (repo) {
      this.repoName = repo.full_name;
      this.actionType = this.ACTION_NEXT;
    },
    goToManager() {
      let target = this;
      GitHubUtils.createGH(this.username, this.pat).getUser().getProfile().then(() => {
        target.$emit('finished', {pat: target.pat, username: target.username, repoName: target.repoName, email: target.email, discordWebhook: target.discordWebhook});
      }).catch(async err => {
        console.log(err);
        const status = err && (err.status || (err.response && err.response.status));
        if (status !== 401 && status !== 403) {
          this.$message.error('Could not reach GitHub: ' + (err && err.message ? err.message : 'unknown error'));
          return;
        }
        const value = await this.$prompt({
          title: 'Token expired',
          text: 'The token you provided is not valid or has expired. Provide the email address to associate with commits (usually the same as your GitHub one).',
          placeholder: 'user@example.org',
          positiveText: 'Continue',
          validate: email => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(email).toLowerCase())
            ? null
            : 'Invalid email address'
        });
        if (!value) {
          return;
        }
        target.email = value;
        window.localStorage.setItem('pat', target.pat);
        target.$emit('finished', {pat: target.pat, username: target.username, repoName: target.repoName, email: target.email, discordWebhook: target.discordWebhook});
      });
    }
  },
  mounted() {
    if (window.localStorage.getItem('pat') && window.localStorage.getItem('username') && window.localStorage.getItem('repo')) {
      this.pat = window.localStorage.getItem('pat');
      this.username = window.localStorage.getItem('username');
      this.repoName = window.localStorage.getItem('repo');
      this.email = window.localStorage.getItem('email') ?? '';
      this.discordWebhook = window.localStorage.getItem('discordWebhook') ?? '';
      this.saved = true;
    }
  }
}
</script>
