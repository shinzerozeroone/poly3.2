import React from 'react';
import { Typography } from '@mui/material';
import type { ImageInfo } from '../../features/upload/ui/FileUpload';

interface StatusBarProps {
    imageInfo: ImageInfo | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ imageInfo }) => {
    if (!imageInfo) {
        return <Typography>Загрузите изображение</Typography>;
    }
    return (
        <Typography>
            Ширина: {imageInfo.width}px, Высота: {imageInfo.height}px, Глубина цвета: {imageInfo.depth} бит
        </Typography>
    );
};

export default StatusBar;
