export default class Groups {

    static getProxyGroup(groupName, url) {
        let result = {};
        result[groupName] = url;
        return result;
    }

    static getImagesGroup(groupName, urls) {
        let result = {};
        result[groupName] = String(urls ?? '').split('\n');
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
        if (!groups) return '';
        const keys = Object.keys(groups);
        return keys.length ? keys[0] : '';
    }

    static isProxy(groups) {
        if (!groups) return false;
        const name = this.getGroupName(groups);
        const value = groups[name];
        return typeof (value ?? []) === "string";
    }

    static getPages(groups) {
        if (!groups) return '';
        const name = this.getGroupName(groups);
        const imgs = groups[name] ?? [];
        if (typeof imgs === "string") {
            return imgs;
        }
        return Array.isArray(imgs) ? imgs.join('\n') : String(imgs ?? '');
    }

}
