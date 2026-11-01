// Collectible stickers: one is earned for every word spelled correctly.
export type Sticker = { emoji: string; name: string };

export const STICKERS: Sticker[] = [
  { emoji: '🦄', name: 'Unicorn' }, { emoji: '🐶', name: 'Puppy' }, { emoji: '🐱', name: 'Kitty' },
  { emoji: '🐼', name: 'Panda' }, { emoji: '🦊', name: 'Fox' }, { emoji: '🐸', name: 'Frog' },
  { emoji: '🐵', name: 'Monkey' }, { emoji: '🦁', name: 'Lion' }, { emoji: '🐯', name: 'Tiger' },
  { emoji: '🐨', name: 'Koala' }, { emoji: '🐰', name: 'Bunny' }, { emoji: '🐧', name: 'Penguin' },
  { emoji: '🦉', name: 'Owl' }, { emoji: '🐢', name: 'Turtle' }, { emoji: '🐙', name: 'Octopus' },
  { emoji: '🐬', name: 'Dolphin' }, { emoji: '🦋', name: 'Butterfly' }, { emoji: '🐞', name: 'Ladybug' },
  { emoji: '🦖', name: 'Dinosaur' }, { emoji: '🐳', name: 'Whale' }, { emoji: '🦒', name: 'Giraffe' },
  { emoji: '🐘', name: 'Elephant' }, { emoji: '🦜', name: 'Parrot' }, { emoji: '🦥', name: 'Sloth' },
  { emoji: '🍩', name: 'Donut' }, { emoji: '🍕', name: 'Pizza' }, { emoji: '🧁', name: 'Cupcake' },
  { emoji: '🍉', name: 'Watermelon' }, { emoji: '🍓', name: 'Strawberry' }, { emoji: '🍦', name: 'Ice Cream' },
  { emoji: '🚀', name: 'Rocket' }, { emoji: '🌈', name: 'Rainbow' }, { emoji: '⚽', name: 'Soccer Ball' },
  { emoji: '🎸', name: 'Guitar' }, { emoji: '🏰', name: 'Castle' }, { emoji: '🎈', name: 'Balloon' },
  { emoji: '🌻', name: 'Sunflower' }, { emoji: '🍄', name: 'Mushroom' }, { emoji: '🪐', name: 'Planet' },
  { emoji: '💎', name: 'Diamond' },
];

/** A random sticker, preferring ones the child doesn't have yet. */
export function pickSticker(owned: Record<string, number>, alsoNew: string[] = []): Sticker {
  const missing = STICKERS.filter((s) => !owned[s.emoji] && !alsoNew.includes(s.emoji));
  const pool = missing.length ? missing : STICKERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
