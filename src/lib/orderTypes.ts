export type NormalizedOrderType = 'straight-bar' | 'cut-and-bend';

export const normalizeOrderType = (value: unknown): NormalizedOrderType => {
  const compact = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (compact === 'cutandbend' || compact === 'cutbend') {
    return 'cut-and-bend';
  }

  return 'straight-bar';
};

