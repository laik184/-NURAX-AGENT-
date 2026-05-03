const BASE_ICON_SIZES = Object.freeze([72, 96, 128, 144, 152, 192, 384, 512]);

export function mapIconSizes(): string[] {
  return BASE_ICON_SIZES.map((size) => `${size}x${size}`);
}
