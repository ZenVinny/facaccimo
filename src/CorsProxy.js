export default class CorsProxy {

    static URL = 'http://localhost:3000';
    static DEV_URL = 'http://localhost:3000';
    // A stalled proxy used to hang the caller (and the global loading overlay)
    // forever; every request now gives up after this long.
    static TIMEOUT_MS = 60000;

    static get(url, headers, options) {
        if (url.startsWith('https://')) {
            url = url.replace('https://', '');
        }
        const timeoutMs = (options && options.timeoutMs) || CorsProxy.TIMEOUT_MS;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        return fetch(CorsProxy.getProxyUrl() + '/' + url, {
            headers: headers,
            signal: controller ? controller.signal : undefined
        }).then(response => {
            if (timer) {
                clearTimeout(timer);
            }
            return response;
        }, error => {
            if (timer) {
                clearTimeout(timer);
            }
            if (error && error.name === 'AbortError') {
                throw new Error('The CORS proxy did not answer within ' + Math.round(timeoutMs / 1000) +
                    's. Is it running at ' + CorsProxy.getProxyUrl() + '?');
            }
            throw error;
        });
    }

    static getProxyUrl() {
        if (process.env.NODE_ENV === 'development') {
            return CorsProxy.DEV_URL;
        }
        return CorsProxy.URL;
    }

    static isAvailable() {
        // Keep the startup check short so a missing proxy does not delay the UI.
        return this.get('https://github.com/', undefined, { timeoutMs: 5000 })
            .then(() => true)
            .catch(() => false);
    }
}
