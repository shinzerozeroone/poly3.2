
export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface XYZ {
    x: number;
    y: number;
    z: number;
}

export interface Lab {
    l: number;
    a: number;
    b: number;
}

export interface LCH {
    l: number;
    c: number;
    h: number;
}

export interface OKLch {
    l: number;
    c: number;
    h: number;
}

export interface ColorInfo {
    x: number;
    y: number;
    rgb: RGB;
    xyz: XYZ;
    lab: Lab;
    lch: LCH;
    oklch: OKLch;
}

export const EMPTY_COLOR_INFO: ColorInfo = {
    x: 0,
    y: 0,
    rgb: { r: 0, g: 0, b: 0 },
    xyz: { x: 0, y: 0, z: 0 },
    lab: { l: 0, a: 0, b: 0 },
    lch: { l: 0, c: 0, h: 0 },
    oklch: { l: 0, c: 0, h: 0 },
};

// Константы для цветовых пространств
const D65 = { x: 95.047, y: 100, z: 108.883 };

// --- Функции конвертации ---

export function rgbToXyz(r: number, g: number, b: number): XYZ {
    r /= 255;
    g /= 255;
    b /= 255;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

    return { x, y, z };
}

export function xyzToLab(x: number, y: number, z: number): Lab {
    x /= D65.x;
    y /= D65.y;
    z /= D65.z;

    const f = (t: number) => (t > 0.008856) ? Math.cbrt(t) : (t * 7.787) + 16 / 116;

    let fx = f(x);
    let fy = f(y);
    let fz = f(z);

    const l = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);

    return { l, a, b };
}

export function labToLch(l: number, a: number, b: number): LCH {
    const c = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a) * 180 / Math.PI;
    if (h < 0) h += 360;

    return { l, c, h };
}

export function labToOklch(l: number, _a: number, _b: number): OKLch {
    return { l, c: 0, h: 0 };
}

// --- Функции для контраста ---

// Расчет светимости (Luminance) по WCAG 2.1
export function getLuminance(r: number, g: number, b: number): number {
    const channelLuminance = (c: number): number => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    return (
        0.2126 * channelLuminance(r) +
        0.7152 * channelLuminance(g) +
        0.0722 * channelLuminance(b)
    );
}

// Расчет контраста по WCAG 2.1
export function getContrastRatio(rgb1: RGB, rgb2: RGB): number {
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b) + 0.05;
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
}

export function isAccessible(ratio: number): boolean {
    return ratio >= 4.5;
}

export interface ImageInfo {
  width: number;
  height: number;
  depth: number;
  imageData?: ImageData;
  imageElement?: HTMLImageElement;
  scale?: number;
  scaledImageData?: ImageData;
  format?: string;
}