import CorsProxy from "./CorsProxy";

const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?imgur\.com\/(?:a|gallery)\/([-\d\w]+)\/?$/;
const CLIENT_ID = 'd70305e7c3ac5c6';

export default class Imgur {
  static isImgurUrl(url) {
    const lines = String(url || '').split('\n').map(s => s.trim()).filter(Boolean);
    return lines.length > 0 && lines.every(value => URL_REGEX.test(value));
  }

  static getAlbumId(url) {
    let exec = URL_REGEX.exec(url);
    if (!exec) {
      return null;
    }
    // Newer imgur URLs may contain a title slug (imgur.com/a/some-title-PNBfVYP),
    // the actual album ID is the last dash-separated segment
    let parts = exec[1].split('-');
    let id = parts[parts.length - 1];
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
      return null;
    }
    return id;
  }

  static getImgArray(url) {
    let urls = String(url || '').split('\n').map(s => s.trim()).filter(Boolean);
    return Promise.allSettled(urls.map(u => {
      let id = Imgur.getAlbumId(u);
    if (!id) {
      return Promise.reject(new Error('Invalid Imgur album URL: ' + u));
    }
    return CorsProxy.get('https://api.imgur.com/post/v1/albums/' + encodeURIComponent(id) + '?client_id=' + CLIENT_ID + '&include=media%2Cadconfig%2Caccount%2Ctags')
          .then(value => {
            if (!value.ok) {
              throw new Error('Failed to fetch imgur album: ' + value.status);
            }
            return value.json();
          })
          .then(value => {
            if (!value.media || value.media.length === 0) {
              throw new Error('Imgur album contains no images');
            }
            return value.media.map(item => item.url);
          });
    })).then(results => {
      const fulfilled = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length > 0 && fulfilled.length === 0) {
        throw rejected[0].reason;
      }
      return fulfilled.flat();
    });
  }
}
