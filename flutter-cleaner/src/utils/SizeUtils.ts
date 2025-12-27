/**
 * Format bytes to human-readable string
 */
export function format(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format bytes to full human-readable string
 */
export function formatFull(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = [
    'Bytes',
    'Kilobytes',
    'Megabytes',
    'Gigabytes',
    'Terabytes',
    'Petabytes',
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Parse a size string back to bytes
 */
export function parse(sizeString: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };

  const match = sizeString.match(/^([\d.]+)\s*([A-Z]+)$/i);
  if (!match) {
    throw new Error(`Invalid size string: ${sizeString}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  if (!units[unit]) {
    throw new Error(`Unknown unit: ${unit}`);
  }

  return value * units[unit];
}

/**
 * Get the appropriate unit for a size
 */
export function getUnit(bytes: number): string {
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return sizes[Math.min(i, sizes.length - 1)];
}

/**
 * Convert bytes to a specific unit
 */
export function toUnit(bytes: number, unit: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  const divisor = units[unit.toUpperCase()];
  if (!divisor) {
    throw new Error(`Unknown unit: ${unit}`);
  }

  return bytes / divisor;
}
