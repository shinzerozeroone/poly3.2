import { useState, useEffect } from 'react'; // Добавил useEffect для логирования
import { Container, Typography, Box, Button } from '@mui/material';

import FileUpload from './features/upload/ui/FileUpload';
import ImageCanvas from './entities/image/ui/ImageCanvas';
import StatusBar from './shared/ui/StatusBar';
import ScaleModal from './features/scaling/ui/ScaleModal';
import { nearestNeighborInterpolation, bilinearInterpolation } from './features/scaling/model/interpolation';

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

function App() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);

  const MAX_SIZE = 4096;

  // Лог 1: Проверка состояния imageInfo при его обновлении
  useEffect(() => {
    if (imageInfo) {
      console.log('App: imageInfo updated. Format:', imageInfo.format, 'Dimensions:', imageInfo.width, 'x', imageInfo.height);
      if (imageInfo.imageData) {
        console.log('App: New imageData object received.');
      }
      if (imageInfo.imageElement) {
        console.log('App: New imageElement received.');
      }
    } else {
      console.log('App: imageInfo is null.');
    }
  }, [imageInfo]);

  const handleApplyScaling = (
    newWidth: number,
    newHeight: number,
    interpolation: 'nearest' | 'bilinear'
  ) => {
    if (!imageInfo?.imageElement) return; // Убедитесь, что imageElement всегда существует

    if (newWidth > MAX_SIZE || newHeight > MAX_SIZE) {
      alert(`Максимальный размер изображения: ${MAX_SIZE}x${MAX_SIZE} пикселей`);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalWidth = imageInfo.imageElement.naturalWidth;
    const originalHeight = imageInfo.imageElement.naturalHeight;

    canvas.width = originalWidth;
    canvas.height = originalHeight;
    ctx.drawImage(imageInfo.imageElement, 0, 0, originalWidth, originalHeight);

    const srcImageData = ctx.getImageData(0, 0, originalWidth, originalHeight);

    let scaledData: ImageData;
    if (interpolation === 'nearest') {
      scaledData = nearestNeighborInterpolation(srcImageData, newWidth, newHeight);
    } else {
      scaledData = bilinearInterpolation(srcImageData, newWidth, newHeight);
    }

    // Создаем новый imageElement из масштабированных данных
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    tempCanvas.getContext('2d')?.putImageData(scaledData, 0, 0);
    const newImageElement = new Image();
    newImageElement.src = tempCanvas.toDataURL();

    setImageInfo({
      ...imageInfo,
      width: newWidth,
      height: newHeight,
      scale: 1,
      imageElement: newImageElement, // Заменяем старый imageElement новым
    });
  };

  return (
    <Container
      maxWidth="md"
      sx={{ mt: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Typography variant="h4" gutterBottom>
        Загрузка изображений (png, jpg, GrayBit-7)
      </Typography>

      <FileUpload onImageLoad={setImageInfo} />

      <Box sx={{ flexGrow: 1, position: 'relative', my: 2 }}>
        <ImageCanvas imageInfo={imageInfo} />

        <StatusBar imageInfo={imageInfo} />
        <Button variant="outlined" onClick={() => setScaleModalOpen(true)} disabled={!imageInfo}>
          Изменить размер
        </Button>
      </Box>

      <ScaleModal
        open={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        imageInfo={imageInfo}
        onApply={handleApplyScaling}
      />
    </Container>
  );
}

export default App;