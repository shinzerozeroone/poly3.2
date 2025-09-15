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

function App() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layersWindowOpen, setLayersWindowOpen] = useState(false);
  const [compositeImage, setCompositeImage] = useState<HTMLImageElement | null>(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'hand' | 'eyedropper'>('hand');
  const [color1, setColor1] = useState<ColorInfo>(EMPTY_COLOR_INFO);
  const [color2, setColor2] = useState<ColorInfo>(EMPTY_COLOR_INFO);

  const MAX_SIZE = 4096;

  useEffect(() => {
    // При загрузке нового базового изображения создаём базовый слой Фон (если еще нет)
    if (!imageInfo?.imageElement) return;

    const baseLayerIndex = layers.findIndex(layer => layer.id === 'base-layer');

    if (baseLayerIndex === -1) {
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
      // Обновляем изображение фона, если меняется базовое фото
      const newLayers = [...layers];
      newLayers[baseLayerIndex] = {
        ...newLayers[baseLayerIndex],
        image: imageInfo.imageElement,
      };
      setLayers(newLayers);
    }
  }, [imageInfo]);

  useEffect(() => {
    if (layers.length === 0) {
      setCompositeImage(null);
      return;
    }
    const width = layers[0]?.image?.naturalWidth || 800;
    const height = layers[0]?.image?.naturalHeight || 600;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Режимы наложения для canvas
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
    };

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over';

      if (layer.image) {
        ctx.drawImage(layer.image, 0, 0, width, height);
      } else if (layer.previewColor) {
        ctx.fillStyle = layer.previewColor;
        ctx.fillRect(0, 0, width, height);
      }

      if (layer.alphaImage && layer.alphaVisible) {
        ctx.globalAlpha = layer.opacity * 0.5;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(layer.alphaImage, 0, 0, width, height);
      }
    }

    const img = new Image();
    img.onload = () => setCompositeImage(img);
    img.src = canvas.toDataURL();
  }, [layers]);

  const handleColorPick = (color: ColorInfo, isAlt: boolean) => {
    if (isAlt) setColor2(color);
    else setColor1(color);
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
        onApply={(w, h, method) => {
          // Ваша логика масштабирования здесь
        }}
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
