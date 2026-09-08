const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function assetUrl(path: string): string {
  return `${assetBase}${path}`;
}
