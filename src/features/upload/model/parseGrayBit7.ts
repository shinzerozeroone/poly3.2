export interface GrayBit7Image {
    width: number;
    height: number;
    depth: number;
    imageData?: ImageData;
    imageElement?: HTMLImageElement;
}

export function parseGrayBit7(buffer: ArrayBuffer): Promise<GrayBit7Image | null> {
    return new Promise((resolve, reject) => {
        const bytes = new Uint8Array(buffer);

        if (
            bytes[0] !== 0x47 ||
            bytes[1] !== 0x42 ||
            bytes[2] !== 0x37 ||
            bytes[3] !== 0x1d
        ) {
            resolve(null);
            return;
        }

        // const version = bytes[4];
        const flag = bytes[5];
        const hasMask = (flag & 0x01) === 1;

        const width = (bytes[6] << 8) | bytes[7];
        const height = (bytes[8] << 8) | bytes[9];

        if (bytes[10] !== 0x00 || bytes[11] !== 0x00) {
            resolve(null);
            return;
        }

        const pixelDataStart = 12;
        const pixelCount = width * height;
        if (bytes.length < pixelDataStart + pixelCount) {
            resolve(null);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < pixelCount; i++) {
            const byte = bytes[pixelDataStart + i];
            const gray7 = byte & 0x7f;
            const maskBit = hasMask ? (byte >> 7) & 1 : 1;
            const grayValue = Math.round((gray7 / 127) * 255);

            const idx = i * 4;
            data[idx] = grayValue;
            data[idx + 1] = grayValue;
            data[idx + 2] = grayValue;
            data[idx + 3] = maskBit ? 255 : 0;
        }
        
        // Отрисовываем imageData на временный канвас
        ctx.putImageData(imageData, 0, 0);

        // Создаём imageElement из канваса
        const imageElement = new Image();
        imageElement.onload = () => {
            resolve({
                width,
                height,
                depth: 7,
                imageData: undefined, 
                imageElement,
            });
        };
        imageElement.onerror = (e) => reject(e);
        imageElement.src = canvas.toDataURL(); 
    });
}