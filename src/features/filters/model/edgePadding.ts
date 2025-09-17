/**
 * Pads the edges of the image data to allow for convolution without boundary issues.
 * This function duplicates the edge pixels to create a border.
 *
 * @param {ImageData} imageData The original image data.
 * @param {number} padding The number of pixels to add to each side (e.g., 1 for a 3x3 kernel).
 * @returns {ImageData} A new ImageData object with padded edges.
 */
export const edgePadding = (imageData: ImageData, padding: number): ImageData => {
    const { width, height, data } = imageData;
    const paddedWidth = width + 2 * padding;
    const paddedHeight = height + 2 * padding;
    const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

    for (let y = 0; y < paddedHeight; y++) {
        for (let x = 0; x < paddedWidth; x++) {
            // Determine the coordinates of the source pixel
            let srcX = x - padding;
            let srcY = y - padding;

            // Clamp the coordinates to the original image boundaries
            if (srcX < 0) srcX = 0;
            if (srcX >= width) srcX = width - 1;
            if (srcY < 0) srcY = 0;
            if (srcY >= height) srcY = height - 1;

            const srcIndex = (srcY * width + srcX) * 4;
            const destIndex = (y * paddedWidth + x) * 4;

            // Copy the pixel data (RGBA)
            paddedData[destIndex] = data[srcIndex];
            paddedData[destIndex + 1] = data[srcIndex + 1];
            paddedData[destIndex + 2] = data[srcIndex + 2];
            paddedData[destIndex + 3] = data[srcIndex + 3];
        }
    }

    return new ImageData(paddedData, paddedWidth, paddedHeight);
};