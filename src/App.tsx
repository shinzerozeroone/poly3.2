import React, { useState, useEffect, useMemo } from 'react';
import { Container, Typography, Box, Button, Tooltip } from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool';
import ColorLensIcon from '@mui/icons-material/ColorLens';

import FileUpload from './features/upload/ui/FileUpload';
import LayerManager, { type Layer } from './features/layers/ui/LayerManager';
import ImageCanvas from './entities/image/ui/ImageCanvas';
import StatusBar from './shared/ui/StatusBar';
import ScaleModal from './features/scaling/ui/ScaleModal';
import ColorInfoPanel from './shared/ui/ColorInfoPanel';
import ExportDialog from './features/export/ui/ExportDialog';
import { type ColorInfo, EMPTY_COLOR_INFO, type ImageInfo } from './entities/color/model/colorUtils';
import { encodeGb7, downloadFile } from './features/export/model/exportToGb7'; // <-- Импортируем новую функцию

import { nearestNeighborInterpolation, bilinearInterpolation } from './features/scaling/model/interpolation';
import { CurvesDialog } from './features/curves/ui/CurvesDialog';

function App() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layersWindowOpen, setLayersWindowOpen] = useState(false);
  const [compositeImage, setCompositeImage] = useState<HTMLImageElement | null>(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [curvesDialogOpen, setCurvesDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(0);
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

  useEffect(() => {
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
        imageData: imageInfo.imageData,
      };
      setLayers([baseLayer, ...layers]);
    } else {
      const newLayers = [...layers];
      newLayers[baseLayerIndex] = {
        ...newLayers[baseLayerIndex],
        image: imageInfo.imageElement,
        imageData: imageInfo.imageData,
      };
      setLayers(newLayers);
    }
  }, [imageInfo]);

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

  const handleColorPick = (color: ColorInfo, isAlt: boolean) => {
    if (isAlt) setColor2(color);
    else setColor1(color);
  };

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

      setLayers(prevLayers => {
        const newLayers = [...prevLayers];
        const activeLayer = newLayers[activeLayerIndex];
        if (activeLayer) {
          newLayers[activeLayerIndex] = {
            ...activeLayer,
            image: newImage,
            imageData: scaledImageData,
          };
        }
        return newLayers;
      });
    };
    newImage.onerror = () => {
      console.error('Ошибка загрузки изображения после масштабирования');
    };
    newImage.src = canvas.toDataURL();
  };

  const handleApplyCurves = (correctedImageData: ImageData, newCurvesData: { x0: number; y0: number; x1: number; y1: number }) => {
    if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
    const layer = layers[activeLayerIndex];
    const canvas = document.createElement('canvas');
    canvas.width = correctedImageData.width;
    canvas.height = correctedImageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(correctedImageData, 0, 0);
    const newImg = new Image();
    newImg.onload = () => {
      const newLayers = [...layers];
      newLayers[activeLayerIndex] = {
        ...layer,
        image: newImg,
        imageData: correctedImageData,
        originalImageData: layer.imageData ? new ImageData(layer.imageData.data, layer.imageData.width, layer.imageData.height) : undefined,
        curves: newCurvesData,
      };
      setLayers(newLayers);
      setCurvesDialogOpen(false);
    };
    newImg.src = canvas.toDataURL();
  };

  const handleOpenCurvesDialog = (index: number) => {
    setActiveLayerIndex(index);
    setCurvesDialogOpen(true);
  };

  const handleExportPng = () => {
    if (!compositeImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = compositeImage.naturalWidth;
    canvas.height = compositeImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(compositeImage, 0, 0);
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportDialogOpen(false);
  };

  const handleExportJpg = () => {
    if (!compositeImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = compositeImage.naturalWidth;
    canvas.height = compositeImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(compositeImage, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportDialogOpen(false);
  };

  const handleExportGb7 = () => {
    if (!compositeImage) {
      alert('Нет скомбинированного изображения для экспорта.');
      return;
    }

    // Создаем временный canvas, чтобы получить ImageData из compositeImage
    const canvas = document.createElement('canvas');
    canvas.width = compositeImage.naturalWidth;
    canvas.height = compositeImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Ошибка при создании канваса.');
      return;
    }

    // Рисуем скомбинированное изображение на временный canvas
    ctx.drawImage(compositeImage, 0, 0);

    // Получаем ImageData скомбинированного изображения
    const combinedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Кодируем полученные данные в GB7
    const buffer = encodeGb7(combinedImageData);
    downloadFile(buffer, 'image.gb7', 'application/octet-stream');
    setExportDialogOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>Загрузка изображений (png, jpg, GrayBit-7)</Typography>
      <FileUpload onImageLoad={setImageInfo} />

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Tooltip title="Инструмент: Рука (H)">
          <Button variant={activeTool === 'hand' ? 'contained' : 'outlined'} onClick={() => setActiveTool('hand')} disabled={!imageInfo} aria-label="hand tool">
            <PanToolIcon />
          </Button>
        </Tooltip>
        <Tooltip title="Инструмент: Пипетка (I)">
          <Button variant={activeTool === 'eyedropper' ? 'contained' : 'outlined'} onClick={() => setActiveTool('eyedropper')} disabled={!imageInfo} aria-label="eyedropper tool">
            <ColorLensIcon />
          </Button>
        </Tooltip>
        <Button variant="outlined" onClick={() => setLayersWindowOpen(!layersWindowOpen)} disabled={!imageInfo}>Слои</Button>
        <Button variant="outlined" onClick={() => setScaleModalOpen(true)} disabled={!imageInfo}>Изменить размер</Button>
        <Button variant="outlined" onClick={() => setExportDialogOpen(true)} disabled={!compositeImage}>Экспорт</Button>
      </Box>

      {layersWindowOpen && (
        <Box sx={{ maxWidth: 400, mb: 2 }}>
          <LayerManager
            layers={layers}
            onChange={setLayers}
            maxLayers={6}
            onSetActiveLayerIndex={setActiveLayerIndex}
            onOpenCurvesDialog={handleOpenCurvesDialog}
          />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ImageCanvas imageInfo={imageInfo} activeTool={activeTool} onColorPick={handleColorPick} compositeImage={compositeImage} setActiveLayerIndex={setActiveLayerIndex} />
      </Box>

      <StatusBar imageInfo={imageInfo} />

      <ScaleModal open={scaleModalOpen} onClose={() => setScaleModalOpen(false)} imageInfo={imageInfo} onApply={handleApplyScaling} />

      {layers[activeLayerIndex] && (
        <CurvesDialog
          open={curvesDialogOpen}
          onClose={() => setCurvesDialogOpen(false)}
          activeLayer={layers[activeLayerIndex] ?? null}
          channel="rgb"
          onApply={handleApplyCurves}
          initialCurves={layers[activeLayerIndex]?.curves}
        />
      )}

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExportPng={handleExportPng}
        onExportJpg={handleExportJpg}
        onExportGb7={handleExportGb7}
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