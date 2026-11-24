export default class Chapter {
  title;
  volume;
  last_updated;
  groups;

  constructor(title, volume, last_updated, groups) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.volume = volume || '';
    const normalized = last_updated === 0 || last_updated === '0' ? '' : last_updated;
    const hasLastUpdated = normalized !== null && normalized !== undefined && normalized !== '';
    this.last_updated = hasLastUpdated ? normalized : (Math.floor((+today) / 1000) + '');
    this.groups = groups || {};
    this.title = title || '';
  }

  getLastUpdated() {
    const n = Number(this.last_updated);
    if (!Number.isFinite(n) || n === 0) return null;
    const d = new Date(n * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  setLastUpdated(date) {
    if (date === null || date === undefined) return;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return;
    this.last_updated = Math.floor(d.getTime() / 1000) + '';
  }

  static fromJson(o) {
    const chapters = Object.create(null);
    if (!o || typeof o !== 'object') return chapters;
    for (const key of Object.keys(o)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      let c = o[key];
      if (!c || typeof c !== 'object') continue;
      chapters[key] = new Chapter(c.title, c.volume, c.last_updated, c.groups);
    }
    return chapters;
  }

}
