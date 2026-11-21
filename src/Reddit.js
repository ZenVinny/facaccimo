import CorsProxy from "./CorsProxy";

const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/[^/\s]+\/comments\/[a-z0-9]+\/[a-z0-9_-]+\/?$/i;
const IMAGE_EXT_REGEX = /\.(?:jpe?g|png|gif|webp)(?:\?.*)?$/i;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36';

function splitLines(value) {
  return String(value ?? '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
}

// Reddit post URLs are usually copied with a trailing slash (the address-bar
// form), and "<slug>/.json" is a 404. Strip it before appending the suffix.
function toJsonUrl(value) {
  let url = value;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url.replace(/\/+$/, '').replace(/\.json$/i, '') + '.json';
}

function decodeHtml(value) {
  return String(value).replace(/&amp;/g, '&');
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

// Gallery metadata holds one entry per media id; videos and failed uploads
// have no usable image URL and must be skipped rather than turned into
// "https://i.redd.it/<id>.undefined".
function galleryImages(post) {
  const items = post.gallery_data && post.gallery_data.items;
  if (!Array.isArray(items)) {
    return [];
  }
  const metadata = post.media_metadata || {};
  const images = [];
  for (const item of items) {
    const data = metadata[item.media_id];
    if (!data || data.status === 'failed') {
      continue;
    }
    if (data.s && isHttpUrl(data.s.u)) {
      images.push(decodeHtml(data.s.u));
      continue;
    }
    const mime = typeof data.m === 'string' ? data.m : '';
    if (!mime.startsWith('image/')) {
      continue;
    }
    images.push('https://i.redd.it/' + item.media_id + '.' + mime.slice('image/'.length));
  }
  return images;
}

// Single-image posts have no gallery_data; fall back to the linked image.
function fallbackImage(post) {
  const preview = post.preview && post.preview.images && post.preview.images[0];
  const candidates = [
    post.url_overridden_by_dest,
    post.url,
    preview && preview.source && preview.source.url
  ];
  for (const candidate of candidates) {
    if (isHttpUrl(candidate) && IMAGE_EXT_REGEX.test(candidate)) {
      return decodeHtml(candidate);
    }
  }
  return null;
}

export default class Reddit {
  static isRedditUrl(url) {
    const lines = splitLines(url);
    return lines.length > 0 && lines.every(value => URL_REGEX.test(value));
  }

  // Resolves with { urls, failures, attempted } so one bad post cannot discard
  // the rest of the batch.
  static getImgArray(url) {
    const lines = splitLines(url);
    return Promise.allSettled(lines.map(value => {
      return CorsProxy.get(toJsonUrl(value), {
        'User-Agent': USER_AGENT
      }).then(response => {
        if (!response.ok) {
          throw new Error('Reddit returned HTTP ' + response.status);
        }
        return response.text();
      }).then(text => {
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Reddit returned a non-JSON response');
        }
        const child = data && data[0] && data[0].data && data[0].data.children && data[0].data.children[0];
        const post = child && child.data;
        if (!post) {
          throw new Error('Reddit post not found');
        }
        const images = galleryImages(post);
        if (images.length === 0) {
          const single = fallbackImage(post);
          if (single) {
            images.push(single);
          }
        }
        if (images.length === 0) {
          throw new Error('No images found in this post');
        }
        return images;
      });
    })).then(results => {
      const urls = [];
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          urls.push(...result.value);
        } else {
          failures.push({
            url: lines[index],
            message: result.reason && result.reason.message ? result.reason.message : 'unknown error'
          });
        }
      });
      return { urls: urls, failures: failures, attempted: lines.length };
    });
  }
}
