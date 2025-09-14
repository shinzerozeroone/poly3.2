export function nearestNeighborInterpolation(
    src: ImageData,
    dstWidth: number,
    dstHeight: number
) {
    const dst = new ImageData(dstWidth, dstHeight);
    const srcWidth = src.width;
    const srcHeight = src.height;
    const srcData = src.data;
    const dstData = dst.data;

    for (let y = 0; y < dstHeight; y++) {
        const srcY = Math.floor((y * srcHeight) / dstHeight);
        for (let x = 0; x < dstWidth; x++) {
            const srcX = Math.floor((x * srcWidth) / dstWidth);
            const srcPos = (srcY * srcWidth + srcX) * 4;
            const dstPos = (y * dstWidth + x) * 4;
            dstData[dstPos] = srcData[srcPos];
            dstData[dstPos + 1] = srcData[srcPos + 1];
            dstData[dstPos + 2] = srcData[srcPos + 2];
            dstData[dstPos + 3] = srcData[srcPos + 3];
        }
    }
    return dst;
}

export function bilinearInterpolation(
    src: ImageData,
    dstWidth: number,
    dstHeight: number
) {
    const dst = new ImageData(dstWidth, dstHeight);
    const srcWidth = src.width;
    const srcHeight = src.height;
    const srcData = src.data;
    const dstData = dst.data;

    function getPixel(x: number, y: number, c: number) {
        x = Math.max(0, Math.min(srcWidth - 1, x));
        y = Math.max(0, Math.min(srcHeight - 1, y));
        return srcData[(y * srcWidth + x) * 4 + c];
    }

    for (let y = 0; y < dstHeight; y++) {
        const fy = ((y * (srcHeight - 1)) / (dstHeight - 1)) || 0;
        const sy = Math.floor(fy);
        const dy = fy - sy;

        for (let x = 0; x < dstWidth; x++) {
            const fx = ((x * (srcWidth - 1)) / (dstWidth - 1)) || 0;
            const sx = Math.floor(fx);
            const dx = fx - sx;

            for (let c = 0; c < 4; c++) {
                const top =
                    getPixel(sx, sy, c) * (1 - dx) +
                    getPixel(sx + 1, sy, c) * dx;
                const bottom =
                    getPixel(sx, sy + 1, c) * (1 - dx) +
                    getPixel(sx + 1, sy + 1, c) * dx;
                dstData[(y * dstWidth + x) * 4 + c] = top * (1 - dy) + bottom * dy;
            }
        }
    }
    return dst;
}
