export default class CorsProxy {

    static URL = 'http://localhost:3000';
    static DEV_URL = 'http://localhost:3000';
    // A stalled proxy used to hang the caller (and the global loading overlay)
    // forever; every request now gives up after this long.
    static TIMEOUT_MS = 30000;

    static get(url, headers, options) {
        // Validate and normalize the upstream URL without mutating arbitrary substrings.
        if (typeof url !== 'string') {
            return Promise.reject(new Error('Invalid URL'));
        }
        let normalized = url.trim();
        if (/^https:\/\//i.test(normalized)) {
            normalized = normalized.replace(/^https:\/\//i, '');
        } else if (/^http:\/\//i.test(normalized)) {
            normalized = normalized.replace(/^http:\/\//i, '');
        } else {
            return Promise.reject(new Error('URL must start with http:// or https://'));
        }
        if (!normalized || !/^[^/]+/.test(normalized)) {
            return Promise.reject(new Error('Invalid URL host'));
        }
        const host = normalized.split('/')[0].split(':')[0].toLowerCase();
        const allowed = ['github.com','api.github.com','raw.githubusercontent.com','mangadex.org','api.mangadex.org','uploads.mangadex.org','cubari.moe','reddit.com','www.reddit.com','old.reddit.com','i.redd.it','preview.redd.it','v.redd.it','imgur.com','i.imgur.com','api.imgur.com','drive.google.com','drive.usercontent.google.com','docs.google.com','lh3.googleusercontent.com','discord.com'];
        if (!allowed.some(h => host === h || host.endsWith('.' + h))) {
            return Promise.reject(new Error('Host not allowed'));
        }
        const timeoutMs = (options && options.timeoutMs) || CorsProxy.TIMEOUT_MS;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let timer = null;
        if (controller) {
            timer = setTimeout(() => controller.abort(), timeoutMs);
        }
        // Fallback timeout when AbortController is unavailable.
        let timeoutHandle = null;
        const fetchPromise = fetch(CorsProxy.getProxyUrl() + '/' + encodeURIComponent(normalized), {
            headers: headers,
            signal: controller ? controller.signal : undefined
        });
        const timeoutPromise = controller ? null : new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        });
        const promise = timeoutPromise ? Promise.race([fetchPromise, timeoutPromise]) : fetchPromise;
        return promise.then(response => {
            if (timer) clearTimeout(timer);
            if (timeoutHandle) clearTimeout(timeoutHandle);
            return response;
        }, error => {
            if (timer) clearTimeout(timer);
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (error && (error.name === 'AbortError' || error.message === 'timeout')) {
                throw new Error('The CORS proxy did not answer within ' + Math.round(timeoutMs / 1000) +
                    's. Is it running at ' + CorsProxy.getProxyUrl() + '?');
            }
            throw error;
        });
    }

    static getProxyUrl() {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            return CorsProxy.DEV_URL;
        }
        return CorsProxy.URL;
    }

    static isAvailable() {
        // Keep the startup check short so a missing proxy does not delay the UI.
        return this.get('https://github.com/', undefined, { timeoutMs: 2000 })
            .then(() => true)
            .catch(() => false);
    }
}
