export default class PageProxy {

    static PROXIES = [
        new PageProxy('mangadex', 'MangaDex', /^https:\/\/mangadex.org\/chapter\/([\d\w-]+)\/?$/),
        new PageProxy('imgur', 'Imgur', /^https:\/\/imgur.com\/(?:a|gallery)\/([-\d\w]+)\/?$/),
        new PageProxy('imgchest', 'Image Chest', /^https:\/\/imgchest.com\/p\/([-\d\w]+)\/?$/),
        new PageProxy('mangasee', 'MangaSee', /^https:\/\/mangasee123.com\/read-online\/([\d\w-]+?)-page-[\d]+\.html$/),
        new PageProxy('mangakatana', 'MangaKatana', /^https:\/\/mangakatana.com\/manga\/([\d\w-.]+)\/c(\d+)\/?$/, function (name, exec) {
            const raw = String(exec[0]).replace(/\/+$/, '');
            const bytes = new TextEncoder().encode(raw);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return '/proxy/api/' + name + '/chapter/' + btoa(binary) + '/';
        }),
        new PageProxy('dynasty', 'Dynasty Scans', /^https:\/\/dynasty-scans.com\/chapters\/([\d\w_]+_ch[\d]+)$/),
        new PageProxy('catbox', 'Catbox', /^https:\/\/catbox.moe\/c\/(\w+)\/?$/),
    ]
    static PROXY_REGEX = /^\/proxy\/api\/(\w+)\/chapter\/([\d\w=+/]+)\/?$/
    _name;
    _niceName;
    urlRegex;
    urlConstructor;


    constructor(name, niceName, urlRegex, urlConstructor) {
        this.urlRegex = urlRegex;
        this._name = name;
        this._niceName = niceName;
        this.urlConstructor = urlConstructor ?? function (name, exec) {
            return '/proxy/api/' + name + '/chapter/' + exec[1];
        };
    }

    static getProxyByUrl(url) {
        if (typeof url !== 'string') return null;
        for (const proxy of PageProxy.PROXIES) {
            if (proxy.urlRegex.test(url)) {
                return proxy;
            }
        }
        return null;
    }

    getProxyUrl(url) {
        if (typeof url !== 'string') return null;
        let exec = this.urlRegex.exec(url);
        if (exec) {
            return this.urlConstructor(this.name, exec);
        }
        return null;
    }

    get name() {
        return this._name;
    }

    get niceName() {
        return this._niceName;
    }
}
