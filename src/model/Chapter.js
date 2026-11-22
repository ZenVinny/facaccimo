export default class Chapter {
  title;
  volume;
  last_updated;
  groups;

  constructor(title, volume, last_updated, groups) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.volume = volume ?? '';
    const hasLastUpdated = last_updated !== null && last_updated !== undefined && last_updated !== '';
    this.last_updated = hasLastUpdated ? last_updated : (Math.floor((+today) / 1000) + '');
    this.groups = groups ?? {};
    this.title = title ?? '';
  }

  getLastUpdated() {
    const n = Number(this.last_updated);
    if (!Number.isFinite(n)) return null;
    const d = new Date(n * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  setLastUpdated(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return;
    this.last_updated = Math.floor(d.getTime() / 1000) + '';
  }

  static fromJson(o) {
    let chapters = {};
    if (!o) return chapters;
    for (const key of Object.keys(o)) {
      let c = o[key];
      if (!c) continue;
      chapters[key] = new Chapter(c.title, c.volume, c.last_updated, c.groups);
    }
    return chapters;
  }

}