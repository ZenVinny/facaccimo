export default class Chapter {
  title;
  volume;
  last_updated;
  groups;

  constructor(title, volume, last_updated, groups) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.volume = volume ?? '';
    this.last_updated = last_updated ?? Math.floor((+today) / 1000) + '';
    this.groups = groups ?? {};
    this.title = title ?? '';
  }

  getLastUpdated() {
    return new Date(+this.last_updated * 1000);
  }

  setLastUpdated(date) {
    this.last_updated = Math.floor((+date) / 1000) + '';
  }

  static fromJson(o) {
    let chapters = {};
    for (const key of Object.keys(o)) {
      let c = o[key];
      chapters[key] = new Chapter(c.title, c.volume, c.last_updated, c.groups);
    }
    return chapters;
  }

}