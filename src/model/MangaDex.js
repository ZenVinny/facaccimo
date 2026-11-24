import CorsProxy from "@/CorsProxy";

export default class MangaDex {

  static API = 'https://api.mangadex.org';

  static async search(query, limit = 6) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 6));
    const url = MangaDex.API + '/manga?title=' + encodeURIComponent(query) +
        '&limit=' + safeLimit + '&includes[]=cover_art';
    const response = await CorsProxy.get(url, { 'User-Agent': 'facaccimo/1.0 (local tool)' });
    if (!response.ok) {
      throw new Error('Search failed (' + response.status + ')');
    }
    const body = await response.json();
    return (body.data || []).map(item => MangaDex.toSummary(item));
  }

  static async getChapters(mangaId) {
    const all = [];
    let offset = 0;
    let total = Infinity;
    let guard = 0;
    const safeId = encodeURIComponent(mangaId);
    while (offset < total && guard < 1000) {
      guard++;
      const url = MangaDex.API + '/manga/' + safeId + '/feed?includeUnavailable=1' +
          '&limit=500&offset=' + offset + '&order[chapter]=asc';
      const response = await CorsProxy.get(url, { 'User-Agent': 'facaccimo/1.0 (local tool)' });
      if (!response.ok) {
        throw new Error('Failed to fetch chapters (' + response.status + ')');
      }
      const body = await response.json();
      const data = Array.isArray(body.data) ? body.data : [];
      all.push(...data);
      if (typeof body.total === 'number') {
        total = body.total;
      }
      const nextOffset = offset + data.length;
      if (data.length === 0 || nextOffset === offset) break;
      offset = nextOffset;
      if (offset >= total) break;
    }
    // Deduplicate by chapter number, preferring English
    const byNumber = Object.create(null);
    for (const ch of all) {
      if (!ch || !ch.attributes || typeof ch.attributes !== 'object') continue;
      const attr = ch.attributes;
      const num = attr.chapter;
      if (num === null || num === undefined || num === '') continue;
      const key = String(num);
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (!byNumber[key]) {
        byNumber[key] = ch;
      } else if (attr.translatedLanguage === 'en' && byNumber[key].attributes && byNumber[key].attributes.translatedLanguage !== 'en') {
        byNumber[key] = ch;
      }
    }
    return Object.values(byNumber).map(ch => {
      const attr = ch.attributes;
      const publishAt = attr.publishAt || attr.readableAt || '';
      let lastUpdated = '';
      if (publishAt) {
        const t = new Date(publishAt).getTime();
        if (Number.isFinite(t)) {
          lastUpdated = Math.floor(t / 1000) + '';
        }
      }
      return {
        number: attr.chapter,
        title: attr.title || '',
        volume: attr.volume || '',
        lastUpdated: lastUpdated
      };
    });
  }

  static toSummary(item) {
    const title = MangaDex.title(item);
    const coverRel = (item.relationships || []).find(r => r.type === 'cover_art');
    const fileName = coverRel && coverRel.attributes ? coverRel.attributes.fileName : null;
    const mangaId = item.id;
    const coverUrl = fileName
        ? 'https://uploads.mangadex.org/covers/' + encodeURIComponent(mangaId) + '/' + encodeURIComponent(fileName)
        : null;
    return {
      id: mangaId,
      title: title,
      status: (item.attributes && item.attributes.status) || '',
      year: (item.attributes && item.attributes.year) || '',
      coverUrl: coverUrl
    };
  }

  static title(item) {
    const titles = item.attributes && item.attributes.title;
    if (!titles) return '';
    return titles.en || titles['ja-ro'] || Object.values(titles)[0] || '';
  }
}
