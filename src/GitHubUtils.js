import * as GitHub from "github-api";
import * as git from "isomorphic-git"
import * as http from "isomorphic-git/http/web"
import LightningFS from "@isomorphic-git/lightning-fs"
import Requestable from "github-api/dist/components/Requestable";
import CorsProxy from "./CorsProxy";

// Simple flag for testing

// Rejections can be non-Error values or Errors without a message string.
function errorMessage(err) {
    if (err && typeof err.message === 'string' && err.message) {
        return err.message;
    }
    return typeof err === 'string' ? err : '';
}

function isPushRejected(err) {
    return !!err && (err.code === 'PushRejectedError' ||
        /(non-fast-forward|not a simple fast-forward|fetch first)/i.test(errorMessage(err)));
}

export default class GitHubUtils {
    static createGH(username, pat) {
        return new GitHub({
            username: username,
            password: pat
        });
    }

    static getRepoList(username, pat, params) {
        let gh = this.createGH(username, pat);
        return gh.getUser().listRepos(Object.assign({
            per_page: 100,
            affiliation: 'owner,collaborator,organization_member',
            sort: 'updated'
        }, params || {}));
    }

    // The user list defaults to 30 entries per page and caps at 100, so walk
    // the pages instead of showing only the first page.
    static async getAllRepos(username, pat) {
        const repos = [];
        for (let page = 1; page <= 10; page++) {
            const response = await GitHubUtils.getRepoList(username, pat, { page: page });
            const batch = (response && response.data) || [];
            repos.push(...batch);
            const link = response && response.headers && (response.headers.link || response.headers.Link);
            if (batch.length < 100 || !link || String(link).indexOf('rel="next"') === -1) {
                break;
            }
        }
        return repos;
    }


    static getEmail(username, pat) {
        let gh = this.createGH(username, pat);
        return gh.getUser().getEmails().then(value => {
            const data = (value && value.data) || [];
            for (const email of data) {
                if (email && email.primary) {
                    return email.email;
                }
            }
            return data.length ? data[0].email : '';
        });
    }

    static createRepo(username, pat, repoName, isPrivate = false) {
        let gh = this.createGH(username, pat);
        return gh.getUser().createRepo({
            name: repoName,
            private: isPrivate,
            description: 'Automatically created repository for cubari.moe'
        });
    }

    static cloneRepo(fullName) {
        const fs = new LightningFS('fs-' + Date.now(), { wipe: true });
        return git.clone({
            fs: fs,
            http: http,
            dir: '/',
            corsProxy: CorsProxy.getProxyUrl(),
            url: 'https://github.com/' + String(fullName || '').split('/').map(encodeURIComponent).join('/')
        })
            .then(() => {
                return fs;
            })
            .catch((err) => {
                if (errorMessage(err).indexOf('Could not find HEAD') !== -1) {
                    return git.init({
                        fs: fs,
                        dir: '/',
                        defaultBranch: 'main'
                    })
                        .then(() => {
                            return git.addRemote({
                                fs: fs,
                                dir: '/',
                                remote: 'origin',
                                url: 'https://github.com/' + fullName
                            })
                        })
                        .then(() => {
                            return git.branch({
                                fs: fs,
                                dir: '/',
                                ref: 'main'
                            })
                        })
                        .then(() => {
                            return fs;
                        })
                } else {
                    throw err;
                }
            })
    }

    static commit(promise, fs, message, email) {
        return promise
            .then(() => {
                return git.commit({
                    fs: fs,
                    dir: '/',
                    author: {
                        name: 'Facaccimo',
                        email: email
                    },
                    message: message
                });
            });
    }

    static push(promise, fs, username, pat) {
        return promise.then(() => GitHubUtils.pushOnly(fs, username, pat));
    }

    static pushOnly(fs, username, pat, force = false) {
        let authFailed = false;
        return git.push({
            fs: fs,
            dir: '/',
            http: http,
            corsProxy: CorsProxy.getProxyUrl(),
            force: force,
            onAuth: () => ({ username: username, password: pat }),
            onAuthFailure: () => {
                authFailed = true;
                return { cancel: true };
            }
        }).catch(err => {
            if (authFailed) {
                const error = new Error('GitHub rejected the token while pushing. Check that it still has the "repo" scope.');
                error.code = 'AuthFailure';
                throw error;
            }
            if (isPushRejected(err)) {
                const error = new Error('The repository changed on GitHub while you were editing, so this push was rejected.');
                error.code = 'PushRejectedError';
                error.remoteChanged = true;
                throw error;
            }
            throw err;
        });
    }

    // Retry the already-committed local state, overwriting the remote branch.
    static pushForce(fs, username, pat) {
        return GitHubUtils.pushOnly(fs, username, pat, true);
    }

    static addSeries(name, series, username, pat, fs, email) {
        if (typeof name !== 'string' || !name || /[\\/]/.test(name) || name === '.' || name === '..') {
            return Promise.reject(new Error('Invalid series file name'));
        }
        return this.push(
            this.commit(
                fs.promises.writeFile('/' + name, JSON.stringify(series, null, 2))
                    .then(() => {
                        return git.add({
                            fs: fs,
                            dir: '/',
                            filepath: name
                        })
                    }), fs, 'Update ' + name, email),
            fs, username, pat);
    }

    static deleteSeries(name, username, pat, fs, email) {
        if (typeof name !== 'string' || !name || /[\\/]/.test(name) || name === '.' || name === '..') {
            return Promise.reject(new Error('Invalid series file name'));
        }
        return this.push(
            this.commit(
                fs.promises.unlink('/' + name, {})
                    .then(() => {
                        return git.remove({
                            fs: fs,
                            dir: '/',
                            filepath: name
                        });
                    }), fs, 'Delete ' + name, email),
            fs, username, pat);
    }

    static async rename(oldName, newName, fs) {
        const data = await fs.promises.readFile('/' + oldName);
        await fs.promises.writeFile('/' + newName, data);
        await fs.promises.unlink('/' + oldName);
        await git.remove({ fs: fs, dir: '/', filepath: oldName });
        await git.add({ fs: fs, dir: '/', filepath: newName });
    }

    static getCurrentBranch(repo, fs) {
        return git.currentBranch({
            fs: fs,
            dir: '/'
        });
    }

    static getSeriesUrl(name, branch, repo) {
        return 'https://raw.githubusercontent.com/' + encodeURIComponent(repo) + '/' + encodeURIComponent(branch) + '/' + encodeURIComponent(name);
    }

    static getBase64EncodedSlug(rawGithubUrl) {
        const url = new URL(rawGithubUrl);
        // Base64 URL-encoded with no padding
        return btoa(unescape(encodeURIComponent(url.host.split('.')[0] + url.pathname)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");
    }

    static getTopics(repo, username, pat) {
        return new RepositoryExtension(repo, {
            username: username,
            password: pat
        }).getTopics(null);
    }

    static setTopics(topics, repo, username, pat) {
        return new RepositoryExtension(repo, {
            username: username,
            password: pat
        }).setTopics(topics, null);
    }
}

// eslint-disable-next-line no-unused-vars
class RepositoryExtension extends Requestable {
    /**
     * Create a RepositoryExtension.
     * @param {string} fullname - the full name of the repository
     * @param {Requestable.auth} [auth] - information required to authenticate to Github
     */
    constructor(fullname, auth) {
        super(auth, null, "mercy-preview");
        this.__fullname = fullname;
    }

    /**
     * Get all repository topics
     * @see https://docs.github.com/en/rest/reference/repos#get-all-repository-topics
     * @param {Requestable.callback} cb - will receive the comparison
     * @return {Promise} - the promise for the http request
     */
    getTopics(cb) {
        return this._request('GET', `/repos/${this.__fullname}/topics`, null, cb);
    }

    /**
     * Replace all repository topics
     * @see https://docs.github.com/en/rest/reference/repos#replace-all-repository-topics
     * @param {array<string>} topics - An array of topics to add to the repository. Pass one or more topics to replace the set of existing topics. Send an empty array ([]) to clear all topics from the repository. Note: Topic names cannot contain uppercase letters.
     * @param {Requestable.callback} cb - will receive the comparison
     * @return {Promise} - the promise for the http request
     */
    setTopics(topics, cb) {
        return this._request('PUT', `/repos/${this.__fullname}/topics`, { names: topics }, cb);
    }

    /**
     * Configures a GitHub Pages site
     * @see https://docs.github.com/en/rest/reference/repos#create-a-github-pages-site
     * @param {string} branch - The repository branch used to publish your site's source files
     * @param {string|null} path - The repository directory that includes the source files for the Pages site
     * @param {Requestable.callback} cb - will receive the comparison
     * @return {Promise} - the promise for the http request
     */
    createPages(branch, path, cb) {
        return this._request('POST', `/repos/${this.__fullname}/pages`, { source: { branch: branch, path: path ?? '/' } }, cb);
    }
}