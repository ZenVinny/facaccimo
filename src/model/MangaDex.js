import CorsProxy from "@/CorsProxy";

export default class MangaDex {

  static API = 'https://api.mangadex.org';

  static async search(query, limit = 6) {
    const url = MangaDex.API + '/manga?title=' + encodeURIComponent(query) +
        '&limit=' + limit + '&includes[]=cover_art';
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
    while (offset < total) {
      const url = MangaDex.API + '/manga/' + mangaId + '/feed?includeUnavailable=1' +
          '&limit=500&offset=' + offset + '&order[chapter]=asc';
      const response = await CorsProxy.get(url, { 'User-Agent': 'facaccimo/1.0 (local tool)' });
      if (!response.ok) {
        throw new Error('Failed to fetch chapters (' + response.status + ')');
      }
      const body = await response.json();
      const data = body.data || [];
      all.push(...data);
      total = body.total || 0;
      offset += data.length;
      if (data.length === 0) break;
    }
    // Deduplicate by chapter number, preferring English
    const byNumber = {};
    for (const ch of all) {
      const attr = ch.attributes;
      const num = attr.chapter;
      if (!num) continue;
      if (!byNumber[num]) {
        byNumber[num] = ch;
      } else if (attr.translatedLanguage === 'en' && byNumber[num].attributes.translatedLanguage !== 'en') {
        byNumber[num] = ch;
      }
    }
    return Object.values(byNumber).map(ch => {
      const attr = ch.attributes;
      const publishAt = attr.publishAt || attr.readableAt || '';
      let lastUpdated = '';
      if (publishAt) {
        lastUpdated = Math.floor(new Date(publishAt).getTime() / 1000) + '';
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
        ? 'https://uploads.mangadex.org/covers/' + mangaId + '/' + fileName
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
