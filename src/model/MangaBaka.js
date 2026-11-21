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
    const url = API + '/v2/series/search?q=' + encodeURIComponent(query) +
        '&limit=' + limit + '&page=' + page;
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
      year: item.published && item.published.start_date ? item.published.start_date.slice(0, 4) : ''
    };
  }

  // Primary English title, falling back to any English title, then any primary one.
  static title(series) {
    const titles = series.titles || [];
    const match = titles.find(t => t.language === 'en' && t.is_primary)
        || titles.find(t => t.language === 'en')
        || titles.find(t => t.is_primary)
        || titles[0];
    return match ? match.title : '';
  }

  static tags(series) {
    return (series.tags || [])
        .filter(tag => tag && tag.name && !tag.is_spoiler)
        .sort((a, b) => {
          const wa = WEIGHT_ORDER[a.weight] === undefined ? 1 : WEIGHT_ORDER[a.weight];
          const wb = WEIGHT_ORDER[b.weight] === undefined ? 1 : WEIGHT_ORDER[b.weight];
          return wa !== wb ? wa - wb : a.name.localeCompare(b.name);
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
    const lines = [];
    if (status) {
      lines.push('Status: ' + status);
    }
    if (tags && tags.length > 0) {
      lines.push('Tags: ' + tags.join(', '));
    }
    if (lines.length === 0) {
      return kept;
    }
    return kept.length > 0 ? kept + '\n\n' + lines.join('\n') : lines.join('\n');
  }
}
