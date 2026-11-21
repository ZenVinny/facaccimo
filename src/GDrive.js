// Google Drive share links come in two shapes:
//   new: https://drive.google.com/file/d/<ID>/view?usp=sharing
//   old: https://drive.google.com/uc?id=<ID>&export=download
// The ID must be captured without the trailing slash or query string: a
// greedy match used to swallow (or backtrack into) the ID and produce a
// download URL pointing at a different, broken file.
const NEW_URL_REGEX = /^(?:https?:\/\/)?drive\.google\.com\/file\/d\/([^/?#\s]+)(?:[/?#].*)?$/i;
const OLD_URL_REGEX = /^(?:https?:\/\/)?drive\.google\.com\/uc\?id=([^&#\s]+)(?:[&#].*)?$/i;
const DOWNLOAD_URL = 'https://drive.usercontent.google.com/download?id=';

// Trim and drop blank lines so a trailing newline (a normal paste) does not
// fail validation or add an empty entry.
function splitLines(value) {
  return String(value ?? '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
}

function toDownloadUrls(values, regex) {
  return values.map(value => {
    const exec = regex.exec(value);
    if (!exec) {
      throw new Error('Not a Google Drive file URL: ' + value);
    }
    return DOWNLOAD_URL + exec[1];
  });
}

export default class GDrive {
  static isGDriveUrl(url) {
    const lines = splitLines(url);
    return lines.length > 0 && lines.every(value => NEW_URL_REGEX.test(value));
  }
  static getImgArray(url) {
    return toDownloadUrls(splitLines(url), NEW_URL_REGEX);
  }
  static isOldGDriveUrl(url) {
    const lines = splitLines(url);
    return lines.length > 0 && lines.every(value => OLD_URL_REGEX.test(value));
  }
  static updateOldUrl(url) {
    return toDownloadUrls(splitLines(url), OLD_URL_REGEX).join('\n');
  }
}
