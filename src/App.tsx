import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Tooltip } from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool';
import ColorLensIcon from '@mui/icons-material/ColorLens';

import FileUpload from './features/upload/ui/FileUpload';
import ImageCanvas from './entities/image/ui/ImageCanvas';
import StatusBar from './shared/ui/StatusBar';
import ScaleModal from './features/scaling/ui/ScaleModal';
import ColorInfoPanel from './shared/ui/ColorInfoPanel';
import { nearestNeighborInterpolation, bilinearInterpolation } from './features/scaling/model/interpolation';
import { type ColorInfo, EMPTY_COLOR_INFO } from './entities/color/model/colorUtils';

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
  const [activeTool, setActiveTool] = useState<'hand' | 'eyedropper'>('hand'); // Состояние для инструмента
  const [color1, setColor1] = useState<ColorInfo>(EMPTY_COLOR_INFO); // Состояние для первого цвета
  const [color2, setColor2] = useState<ColorInfo>(EMPTY_COLOR_INFO); // Состояние для второго цвета

  const MAX_SIZE = 4096;

  // useEffect для горячих клавиш
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'H' || event.key === 'h') {
        setActiveTool('hand');
      } else if (event.key === 'I' || event.key === 'i') {
        setActiveTool('eyedropper');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    if (!imageInfo?.imageElement) return;

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
      imageElement: newImageElement,
    });
  };

  // Обработчик выбора цвета пипеткой
  const handleColorPick = (color: ColorInfo, isAltPressed: boolean) => {
    if (isAltPressed) {
      setColor2(color);
    } else {
      setColor1(color);
    }
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
        {/* Панель с кнопками инструментов */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Tooltip title="Инструмент: Рука (H)">
            <Button
              variant={activeTool === 'hand' ? 'contained' : 'outlined'}
              onClick={() => setActiveTool('hand')}
              disabled={!imageInfo}
              aria-label="hand tool"
            >
              <PanToolIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Инструмент: Пипетка (I)">
            <Button
              variant={activeTool === 'eyedropper' ? 'contained' : 'outlined'}
              onClick={() => setActiveTool('eyedropper')}
              disabled={!imageInfo}
              aria-label="eyedropper tool"
            >
              <ColorLensIcon />
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={() => setScaleModalOpen(true)}
            disabled={!imageInfo}
          >
            Изменить размер
          </Button>
        </Box>

        <ImageCanvas
          imageInfo={imageInfo}
          activeTool={activeTool}
          onColorPick={handleColorPick} // Передаем обработчик в canvas
        />

        <StatusBar imageInfo={imageInfo} />
      </Box>

      <ScaleModal
        open={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        imageInfo={imageInfo}
        onApply={handleApplyScaling}
      />

      {/* Панель информации о цвете */}
      {activeTool === 'eyedropper' && (
        <Box sx={{ mt: 4 }}>
          <ColorInfoPanel color1={color1} color2={color2} />
        </Box>
      )}

    </Container>
  );
}

export default App;