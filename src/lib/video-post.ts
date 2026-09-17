export function serializeVideoPost(post: any) {
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    kind: post.kind,
    mediaType: post.mediaType,
    assetId: post.assetId,
    assetUrl: post.asset ? `/api/media/${post.asset.id}` : null,
    externalUrl: post.externalUrl || null,
    thumbnailAssetId: post.thumbnailAssetId || null,
    thumbnailUrl: post.thumbnailAsset ? `/api/media/${post.thumbnailAsset.id}` : (post.thumbnailUrl || null),
    subtitlesUrl: post.subtitlesUrl || null,
    durationSec: post.durationSec,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      username: post.author.username,
      avatarId: post.author.avatarId,
      avatarPhoto: post.author.profilePhotoId ? `/api/media/${post.author.profilePhotoId}` : null,
    },
    likes: post._count.likes,
    saves: post._count.saves,
    comments: post._count.comments,
    liked: post.likes.length > 0,
    saved: post.saves.length > 0,
  };
}
