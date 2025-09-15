import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Tooltip } from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool';
import ColorLensIcon from '@mui/icons-material/ColorLens';

import FileUpload from './features/upload/ui/FileUpload';
import LayerManager, { type Layer } from './features/layers/ui/LayerManager';
import ImageCanvas from './entities/image/ui/ImageCanvas';
import StatusBar from './shared/ui/StatusBar';
import ScaleModal from './features/scaling/ui/ScaleModal';
import ColorInfoPanel from './shared/ui/ColorInfoPanel';
import { type ColorInfo, EMPTY_COLOR_INFO, type ImageInfo } from './entities/color/model/colorUtils';

import { nearestNeighborInterpolation, bilinearInterpolation } from './features/scaling/model/interpolation'; // ваш путь

function App() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layersWindowOpen, setLayersWindowOpen] = useState(false);
  const [compositeImage, setCompositeImage] = useState<HTMLImageElement | null>(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'hand' | 'eyedropper'>('hand');
  const [color1, setColor1] = useState<ColorInfo>(EMPTY_COLOR_INFO);
  const [color2, setColor2] = useState<ColorInfo>(EMPTY_COLOR_INFO);

  useEffect(() => {
    if (!imageInfo?.imageElement) return;
    const img = imageInfo.imageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setImageInfo(prev => prev ? { ...prev, imageData: data } : prev);
  }, [imageInfo?.imageElement]);

  // При загрузке нового базового изображения создаём базовый слой с id 'base-layer',
  // или обновляем существующий базовый слой
  useEffect(() => {
    if (!imageInfo?.imageElement) return;

    const baseLayerIndex = layers.findIndex(layer => layer.id === 'base-layer');

    if (baseLayerIndex === -1) {
      // Базовый слой отсутствует - добавляем в начало
      const baseLayer: Layer = {
        id: 'base-layer',
        name: 'Фон',
        image: imageInfo.imageElement,
        visible: true,
        alphaVisible: true,
        opacity: 1,
        blendMode: 'normal',
      };
      setLayers([baseLayer, ...layers]);
    } else {
      // Обновляем базовый слой
      const newLayers = [...layers];
      newLayers[baseLayerIndex] = {
        ...newLayers[baseLayerIndex],
        image: imageInfo.imageElement,
      };
      setLayers(newLayers);
    }
  }, [imageInfo]);

  // Перерисовка итогового изображения на основе слоёв
  useEffect(() => {
    if (layers.length === 0) {
      setCompositeImage(null);
      return;
    }
    const baseLayer = layers.find(layer => layer.id === 'base-layer');
    if (!baseLayer || !baseLayer.image) return;

    const width = baseLayer.image.naturalWidth;
    const height = baseLayer.image.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
    };

    // Рисуем каждый слой по порядку, пропуская скрытые
    layers.forEach(layer => {
      if (!layer.visible || !layer.image) return;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over';
      ctx.drawImage(layer.image, 0, 0, width, height);

      if (layer.alphaImage && layer.alphaVisible) {
        ctx.globalAlpha = layer.opacity * 0.5;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(layer.alphaImage, 0, 0, width, height);
      }
    });

    const img = new Image();
    img.onload = () => setCompositeImage(img);
    img.src = canvas.toDataURL();
  }, [layers]);

  // Защита базового слоя от удаления в LayerManager
  // (зависит от реализации LayerManager, сюда нужно добавить логику защиты удаления "base-layer")

  const handleColorPick = (color: ColorInfo, isAlt: boolean) => {
    if (isAlt) setColor2(color);
    else setColor1(color);
  };

  // Масштабирование изображения с передачей результата в imageInfo
  const handleApplyScaling = (
    newWidth: number,
    newHeight: number,
    interpolation: 'nearest' | 'bilinear'
  ) => {
    if (!imageInfo?.imageData) {
      console.warn('Нет imageData для масштабирования');
      return;
    }

    const scaledImageData =
      interpolation === 'nearest'
        ? nearestNeighborInterpolation(imageInfo.imageData, newWidth, newHeight)
        : bilinearInterpolation(imageInfo.imageData, newWidth, newHeight);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Не удалось получить 2d контекст');
      return;
    }
    ctx.putImageData(scaledImageData, 0, 0);

    const newImage = new Image();
    newImage.onload = () => {
      setImageInfo({
        ...imageInfo,
        width: newWidth,
        height: newHeight,
        imageData: scaledImageData,
        imageElement: newImage,
        scale: 1,
      });
    };
    newImage.onerror = () => {
      console.error('Ошибка загрузки изображения после масштабирования');
    };
    newImage.src = canvas.toDataURL();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>
        Загрузка изображений (png, jpg, GrayBit-7)
      </Typography>

      <FileUpload onImageLoad={setImageInfo} />

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
        <Button variant="outlined" onClick={() => setLayersWindowOpen(!layersWindowOpen)} disabled={!imageInfo}>
          Слои
        </Button>
        <Button variant="outlined" onClick={() => setScaleModalOpen(true)} disabled={!imageInfo}>
          Изменить размер
        </Button>
      </Box>

      {layersWindowOpen && (
        <Box sx={{ maxWidth: 400, mb: 2 }}>
          <LayerManager layers={layers} onChange={setLayers} maxLayers={6} />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ImageCanvas
          imageInfo={imageInfo}
          activeTool={activeTool}
          onColorPick={handleColorPick}
          compositeImage={compositeImage}
        />
      </Box>

      <StatusBar imageInfo={imageInfo} />

      <ScaleModal
        open={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        imageInfo={imageInfo}
        onApply={handleApplyScaling}
      />

      {activeTool === 'eyedropper' && (
        <Box sx={{ mt: 4 }}>
          <ColorInfoPanel color1={color1} color2={color2} />
        </Box>
      )}
    </Container>
  );
}

export default App;
