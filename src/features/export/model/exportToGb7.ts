/**
 * Encodes image data into the GB7 format, including the header.
 *
 * @param imageData - The ImageData object to be encoded.
 * @returns An ArrayBuffer containing the encoded GB7 data.
 */
export const encodeGb7 = (imageData: ImageData): ArrayBuffer => {
    const { width, height, data } = imageData;
    const size = width * height;

    // Header (12 bytes)
    const headerBuffer = new ArrayBuffer(12);
    const headerView = new DataView(headerBuffer);
    
    // Magic number: 'GB7\x1d'
    headerView.setUint8(0, 0x47); 
    headerView.setUint8(1, 0x42); 
    headerView.setUint8(2, 0x37); 
    headerView.setUint8(3, 0x1d); 
    
    // Version
    headerView.setUint8(4, 0x01); 
    
    // Flag (0x00 for no mask)
    headerView.setUint8(5, 0x00); 
    
    // Width (Big Endian)
    headerView.setUint16(6, width, false); 
    
    // Height (Big Endian)
    headerView.setUint16(8, height, false); 
    
    // Reserved
    headerView.setUint16(10, 0, false); 

    // Image data buffer
    const pixelBuffer = new ArrayBuffer(size);
    const pixelView = new DataView(pixelBuffer);

    for (let i = 0; i < size; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        // Convert to grayscale using the luminosity method
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Scale the 0-255 range to 0-127 for GB7
        const scaledGray = Math.round((gray / 255) * 127);

        // Write the scaled grayscale value to the buffer
        pixelView.setUint8(i, scaledGray);
    }

    // Combine header and pixel data
    const combinedBuffer = new Uint8Array(12 + size);
    combinedBuffer.set(new Uint8Array(headerBuffer), 0);
    combinedBuffer.set(new Uint8Array(pixelBuffer), 12);
    
    return combinedBuffer.buffer;
};

/**
 * Triggers the download of a file with a given buffer.
 * @param buffer - The ArrayBuffer to download.
 * @param filename - The name of the file.
 * @param mimeType - The MIME type of the file.
 */
export const downloadFile = (buffer: ArrayBuffer, filename: string, mimeType: string) => {
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};