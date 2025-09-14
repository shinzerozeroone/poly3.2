// FileUpload.tsx
import React, { useRef, useState } from 'react';
import { Button, Box, Typography } from '@mui/material';

// Import the async parser
import { parseGrayBit7 } from '../model/parseGrayBit7';

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

interface FileUploadProps {
    onImageLoad: (imageInfo: ImageInfo) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageLoad }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        let imageInfo: ImageInfo | null = null;

        const fileReader = new FileReader();

        if (file.name.endsWith('.gb7')) {
            // Обработка GB7
            fileReader.onload = async (e) => {
                const buffer = e.target?.result as ArrayBuffer;
                // Асинхронный вызов, ждём результат
                const gb7Info = await parseGrayBit7(buffer);
                if (gb7Info) {
                    onImageLoad({
                        ...gb7Info,
                        format: 'gb7',
                    });
                }
            };
            fileReader.readAsArrayBuffer(file);
        } else {
            // Обработка PNG/JPG
            fileReader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    onImageLoad({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        depth: 8, // PNG/JPG имеют глубину 8 бит
                        imageElement: img,
                        format: 'image',
                    });
                };
                img.src = e.target?.result as string;
            };
            fileReader.readAsDataURL(file);
        }
    };

    return (
        <Box sx={{ my: 2 }}>
            <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gb7"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <Button variant="contained" onClick={() => inputRef.current?.click()}>
                Выбрать файл
            </Button>
            {fileName && <Typography variant="body1" sx={{ ml: 2, display: 'inline' }}>{fileName}</Typography>}
        </Box>
    );
};

export default FileUpload;