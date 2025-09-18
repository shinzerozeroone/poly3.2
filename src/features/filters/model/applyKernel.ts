//@ts-nocheck


import { edgePadding } from './edgePadding';

/**
 * Applies a convolution kernel to an ImageData object.
 *
 * @param {ImageData} imageData The original image data.
 * @param {number[][]} kernel The 3x3 convolution kernel.
 * @returns {ImageData} A new ImageData object with the filter applied.
 */
export const applyKernel = (imageData: ImageData, kernel: number[][]): ImageData => {
    const { width, height, data } = imageData;
    const kernelSize = kernel.length;
    const halfKernelSize = Math.floor(kernelSize / 2);
    const outputData = new Uint8ClampedArray(width * height * 4);

    // Get padded image data to handle edges
    const paddedImageData = edgePadding(imageData, halfKernelSize);
    const paddedWidth = paddedImageData.width;
    const paddedData = paddedImageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;

            // Iterate over the kernel
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    // Calculate the source coordinates in the padded image
                    const srcX = x + kx;
                    const srcY = y + ky;
                    const srcIndex = (srcY * paddedWidth + srcX) * 4;

                    const kernelValue = kernel[ky][kx];

                    r += paddedData[srcIndex] * kernelValue;
                    g += paddedData[srcIndex + 1] * kernelValue;
                    b += paddedData[srcIndex + 2] * kernelValue;
                    a = paddedData[srcIndex + 3]; // Alpha channel is usually not affected
                }
            }

            // Calculate the destination index
            const destIndex = (y * width + x) * 4;

            // Clamp the values to the 0-255 range
            outputData[destIndex] = Math.min(255, Math.max(0, r));
            outputData[destIndex + 1] = Math.min(255, Math.max(0, g));
            outputData[destIndex + 2] = Math.min(255, Math.max(0, b));
            outputData[destIndex + 3] = a;
        }
    }

    return new ImageData(outputData, width, height);
};