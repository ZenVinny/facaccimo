export default class Groups {

    static _safeKey(name) {
        const key = (name == null ? '' : String(name));
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') return null;
        return key;
    }

    static getProxyGroup(groupName, url) {
        const key = this._safeKey(groupName);
        if (key === null) return Object.create(null);
        const result = Object.create(null);
        result[key] = url;
        return result;
    }

    static getImagesGroup(groupName, urls) {
        const key = this._safeKey(groupName);
        if (key === null) return Object.create(null);
        let list;
        if (Array.isArray(urls)) {
            list = urls.map(u => (u == null ? '' : String(u)));
        } else if (typeof urls === 'string') {
            list = urls.split('\n');
        } else if (urls == null) {
            list = [];
        } else {
            list = String(urls).split('\n');
        }
        const result = Object.create(null);
        result[key] = list;
        return result;
    }

    static getGroups(groupName, pages, isProxy) {
        if (isProxy) {
            return this.getProxyGroup(groupName, pages);
        } else {
            return this.getImagesGroup(groupName, pages);
        }
    }

    static getGroupName(groups) {
        if (!groups || typeof groups !== 'object') return '';
        const keys = Object.keys(groups);
        return keys.length ? keys[0] : '';
    }

    static isProxy(groups) {
        if (!groups || typeof groups !== 'object') return false;
        const name = this.getGroupName(groups);
        if (name === '') return false;
        const value = groups[name];
        return typeof value === 'string';
    }

    static getPages(groups) {
        if (!groups || typeof groups !== 'object') return '';
        const name = this.getGroupName(groups);
        const imgs = groups[name];
        if (imgs == null) return '';
        if (typeof imgs === 'string') {
            return imgs;
        }
        return Array.isArray(imgs) ? imgs.join('\n') : String(imgs);
    }

}
