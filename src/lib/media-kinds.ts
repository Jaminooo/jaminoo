// Canonical media kind values + predicates.
export const MEDIA_IMAGE = 'IMAGE';
export const MEDIA_VOICE = 'VOICE';
export const MEDIA_IMAGE_ASSET = 'IMAGE_ASSET';
export const MEDIA_VIDEO_ASSET = 'VIDEO_ASSET';
export const MEDIA_CINEMA_ASSET = 'CINEMA_ASSET';

export const TWEET_MEDIA_KINDS = [MEDIA_IMAGE_ASSET, MEDIA_VIDEO_ASSET] as const;

export function isImageKind(kind: string | null | undefined) {
  return kind === MEDIA_IMAGE || kind === MEDIA_IMAGE_ASSET;
}

export function isVideoKind(kind: string | null | undefined) {
  return kind === MEDIA_VIDEO_ASSET || kind === MEDIA_CINEMA_ASSET;
}

export function kindForMime(mime: string) {
  return mime.startsWith('image/') ? MEDIA_IMAGE_ASSET : MEDIA_VIDEO_ASSET;
}