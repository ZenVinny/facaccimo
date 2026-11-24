const API = 'https://api.mangabaka.org';
const WEIGHT_ORDER = { defining: 0, unweighted: 1, incidental: 2 };

function readJson(response) {
  if (!response.ok) {
    return response.json().catch(() => ({})).then(body => {
      const message = body && body.message ? body.message : 'request failed (' + response.status + ')';
      throw new Error(message);
    });
  }
  return response.json();
}

export default class MangaBaka {

  static search(query, limit = 6, page = 1) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 6));
    const safePage = Math.max(1, Number(page) || 1);
    const url = API + '/v2/series/search?q=' + encodeURIComponent(query) +
        '&limit=' + safeLimit + '&page=' + safePage;
    return fetch(url)
        .then(readJson)
        .then(body => ({
          results: (body.data || []).map(item => MangaBaka.toSummary(item)),
          total: (body.pagination && typeof body.pagination.count === 'number')
              ? body.pagination.count : (body.data || []).length
        }));
  }

  static getSeries(id) {
    return fetch(API + '/v2/series/' + encodeURIComponent(id) + '?schema=full')
        .then(readJson)
        .then(body => body.data);
  }

  static toSummary(item) {
    return {
      id: item.id,
      title: MangaBaka.title(item),
      type: item.type || '',
      status: item.status || '',
      year: item.published && typeof item.published.start_date === 'string' && item.published.start_date.length >= 4
          ? item.published.start_date.slice(0, 4) : ''
    };
  }

  // Primary English title, falling back to any English title, then any primary one.
  static title(series) {
    const titles = Array.isArray(series.titles) ? series.titles.filter(t => t && typeof t === 'object') : [];
    const match = titles.find(t => t.language === 'en' && t.is_primary)
        || titles.find(t => t.language === 'en')
        || titles.find(t => t.is_primary)
        || titles[0];
    return match && typeof match.title === 'string' ? match.title : (match && match.title != null ? String(match.title) : '');
  }

  static tags(series) {
    return (Array.isArray(series.tags) ? series.tags : [])
        .filter(tag => tag && tag.name && !tag.is_spoiler)
        .sort((a, b) => {
          const wa = WEIGHT_ORDER[a.weight] === undefined ? 1 : WEIGHT_ORDER[a.weight];
          const wb = WEIGHT_ORDER[b.weight] === undefined ? 1 : WEIGHT_ORDER[b.weight];
          const na = a && a.name != null ? String(a.name) : '';
          const nb = b && b.name != null ? String(b.name) : '';
          return wa !== wb ? wa - wb : na.localeCompare(nb);
        })
        .map(tag => tag.name);
  }

  // Replaces any existing "Tags:" / "Status:" lines, keeps the rest of the text.
  static applyMeta(description, tags, status) {
    const kept = String(description || '')
        .split('\n')
        .filter(line => !/^\s*(tags|status)\s*:/i.test(line))
        .join('\n')
        .trim();
    const sanitize = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
    const lines = [];
    if (status) {
      lines.push('Status: ' + sanitize(status));
    }
    if (tags && tags.length > 0) {
      lines.push('Tags: ' + tags.map(sanitize).join(', '));
    }
    if (lines.length === 0) {
      return kept;
    }
    return kept.length > 0 ? kept + '\n\n' + lines.join('\n') : lines.join('\n');
  }
}
