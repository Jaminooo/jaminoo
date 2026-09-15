export const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳','😜','🤪',
  '😇','🙂','😉','😴','🥺','😢','😭','😤','😡','🤯','😳','🥵',
  '🥶','😱','🤔','🤫','🫡','🤗','🤌','👍','👎','👏','🙌','🤝',
  '🙏','👋','🫶','💪','❤️','🧡','💛','💚','💙','💜','🖤','🤍',
  '💯','✨','🔥','⭐','✨','💥','🌀','🌈','☀️','🌙','⭐','⚡',
  '🍕','🍔','🍟','🌭','🍩','🍪','🍰','🧁','🍫','🍉','🍇','🍓',
  '🎉','🎊','🎁','🎵','🎶','🎤','🎧','🎸','🎹','🎮','🎬','📱',
  '💬','📝','🔔','🔒','🔓','💡','💎','🚀','🛸','✈️','🏆','🥇',
];

const PICTO = /\p{Extended_Pictographic}/u;

export function isEmojiSegment(seg: string) {
  return PICTO.test(seg);
}

export function emojiUrl(seg: string) {
  const cps = Array.from(seg)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-');
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cps}.svg`;
}