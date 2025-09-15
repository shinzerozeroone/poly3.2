import React, { useState } from 'react';
import {
    Box, Typography, IconButton, Button, Slider,
    Select, MenuItem, Tooltip, Checkbox, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { parseGrayBit7 } from '../../upload/model/parseGrayBit7';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface Layer {
    id: string;
    name: string;
    image?: HTMLImageElement;
    alphaImage?: HTMLImageElement | null;
    visible: boolean;
    alphaVisible: boolean;
    opacity: number;
    blendMode: BlendMode;
    previewColor?: string;
    imageData?: ImageData;
    originalImageData?: ImageData;
    curves?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

interface LayerManagerProps {
    layers: Layer[];
    onChange: (layers: Layer[]) => void;
    maxLayers?: number;
    onSetActiveLayerIndex: (index: number) => void;
    onOpenCurvesDialog: (index: number) => void;
}

const blendModeTooltips: Record<BlendMode, string> = {
    normal: 'Обычный — накладывает верхний слой без изменений.',
    multiply: 'Умножение — умножает цвета для затемнения.',
    screen: 'Экран — инвертирует, умножает и снова инвертирует для осветления.',
    overlay: 'Наложение — сочетает multiply и screen для контраста.',
};

function genId() {
    return Math.random().toString(36).substr(2, 9);
}

const LayerManager: React.FC<LayerManagerProps> = ({ layers, onChange, maxLayers = 5, onSetActiveLayerIndex, onOpenCurvesDialog }) => {
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newLayerName, setNewLayerName] = useState('Новый слой');
    const [colorFill, setColorFill] = useState('#ffffff');
    const [fileInput, setFileInput] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAddLayer = () => {
        if (layers.length >= maxLayers) {
            alert(`Максимум ${maxLayers} слоев.`);
            return;
        }

        if (!fileInput) {
            const newLayer: Layer = {
                id: genId(),
                name: newLayerName,
                visible: true,
                alphaVisible: true,
                opacity: 1,
                blendMode: 'normal',
                previewColor: colorFill,
            };
            const newLayers = [...layers, newLayer];
            onChange(newLayers);
            onSetActiveLayerIndex(newLayers.length - 1);
            setAddDialogOpen(false);
            return;
        }

        const file = fileInput;
        const reader = new FileReader();

        reader.onloadstart = () => setLoading(true);

        reader.onload = async (e) => {
            const result = e.target?.result;
            try {
                let img: HTMLImageElement;
                let newImageData: ImageData;

                if (file.name.toLowerCase().endsWith('.gb7')) {
                    const gb7image = await parseGrayBit7(result as ArrayBuffer);
                    if (!gb7image || !gb7image.imageElement) {
                        throw new Error('Не удалось распарсить .gb7 файл');
                    }
                    img = gb7image.imageElement;
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Could not get 2D context.');
                    ctx.drawImage(img, 0, 0);
                    newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                } else {
                    img = new Image();
                    img.src = result as string;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Could not get 2D context.');
                    ctx.drawImage(img, 0, 0);
                    newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }

                const newLayer: Layer = {
                    id: genId(),
                    name: newLayerName,
                    image: img,
                    imageData: newImageData,
                    alphaImage: null,
                    visible: true,
                    alphaVisible: true,
                    opacity: 1,
                    blendMode: 'normal',
                };

                const newLayers = [...layers, newLayer];
                onChange(newLayers);
                onSetActiveLayerIndex(newLayers.length - 1);
                setAddDialogOpen(false);
                setFileInput(null);

            } catch (error: any) {
                alert('Ошибка при загрузке или обработке файла: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        if (file.name.toLowerCase().endsWith('.gb7')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsDataURL(file);
        }
    };


    const moveLayer = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= layers.length) return;
        const newLayers = [...layers];
        [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
        onChange(newLayers);
    };

    const toggleVisible = (index: number) => {
        const newLayers = [...layers];
        newLayers[index].visible = !newLayers[index].visible;
        onChange(newLayers);
    };

    const toggleAlphaVisible = (index: number) => {
        const newLayers = [...layers];
        newLayers[index].alphaVisible = !newLayers[index].alphaVisible;
        onChange(newLayers);
    };

    const deleteLayer = (index: number) => {
        const newLayers = [...layers];
        newLayers.splice(index, 1);
        onChange(newLayers);
    };

    const deleteAlpha = (index: number) => {
        const newLayers = [...layers];
        newLayers[index].alphaImage = null;
        onChange(newLayers);
    };

    const deleteCurves = (index: number) => {
        const newLayers = [...layers];
        const layer = newLayers[index];

        if (layer.originalImageData) {
            // Восстанавливаем imageData из сохраненной копии
            const canvas = document.createElement('canvas');
            canvas.width = layer.originalImageData.width;
            canvas.height = layer.originalImageData.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.putImageData(layer.originalImageData, 0, 0);
                const newImg = new Image();
                newImg.onload = () => {
                    newLayers[index] = {
                        ...layer,
                        image: newImg,
                        imageData: layer.originalImageData, // Восстанавливаем данные
                        originalImageData: undefined, // Очищаем сохраненные данные
                        curves: undefined, // Удаляем параметры кривой
                    };
                    onChange(newLayers);
                };
                newImg.src = canvas.toDataURL();
            }
        } else {
            newLayers[index] = {
                ...layer,
                curves: undefined,
            };
            onChange(newLayers);
        }
    };

    const changeOpacity = (index: number, value: number) => {
        const newLayers = [...layers];
        newLayers[index].opacity = value;
        onChange(newLayers);
    };

    const changeBlendMode = (index: number, mode: BlendMode) => {
        const newLayers = [...layers];
        newLayers[index].blendMode = mode;
        onChange(newLayers);
    };

    return (
        <Box sx={{ p: 2, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>Слои</Typography>
            {layers.length === 0 && <Typography>Слои отсутствуют. Нажмите «Добавить слой».</Typography>}
            {layers.map((layer, index) => (
                <Box key={layer.id}
                    sx={{
                        border: index === layers.length - 1 ? '2px solid blue' : '1px solid gray',
                        mb: 1,
                        p: 1,
                        bgcolor: layer.visible ? 'background.paper' : '#f0f0f0',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ flexGrow: 1, fontWeight: index === layers.length - 1 ? 'bold' : 'normal' }}>
                            {layer.name}
                        </Typography>
                        <Tooltip title="Переместить вверх">
                            <IconButton disabled={index === 0} onClick={() => moveLayer(index, 'up')}>
                                <ArrowUpwardIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Переместить вниз">
                            <IconButton disabled={index === layers.length - 1} onClick={() => moveLayer(index, 'down')}>
                                <ArrowDownwardIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={layer.visible ? 'Скрыть слой' : 'Показать слой'}>
                            <IconButton onClick={() => toggleVisible(index)}>{layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить слой">
                            <IconButton onClick={() => deleteLayer(index)}><DeleteIcon /></IconButton>
                        </Tooltip>
                    </Box>
                    <Box sx={{
                        width: 80, height: 50, border: '1px solid black', my: 1,
                        backgroundColor: layer.previewColor || undefined,
                        backgroundImage: layer.image ? `url(${layer.image.src})` : undefined,
                        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                        position: 'relative'
                    }}>
                        {layer.alphaImage && layer.alphaVisible && (
                            <Box component="img" src={layer.alphaImage.src} alt="Alpha Preview"
                                sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5, pointerEvents: 'none' }}
                            />
                        )}
                    </Box>
                    <FormControlLabel
                        control={<Checkbox checked={layer.alphaVisible} onChange={() => toggleAlphaVisible(index)} disabled={!layer.alphaImage} />}
                        label="Показать альфа-канал"
                    />
                    {layer.alphaImage && <Button size="small" color="error" onClick={() => deleteAlpha(index)}>Удалить альфа-канал</Button>}
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                        {layer.imageData && (
                            !layer.curves ? (
                                <Button size="small" variant="outlined" onClick={() => onOpenCurvesDialog(index)}>
                                    Добавить кривую
                                </Button>
                            ) : (
                                <>
                                    <Button size="small" variant="contained" onClick={() => onOpenCurvesDialog(index)}>
                                        Редактировать кривую
                                    </Button>
                                    <Button size="small" color="error" variant="outlined" onClick={() => deleteCurves(index)}>
                                        Удалить
                                    </Button>
                                </>
                            )
                        )}
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <Typography gutterBottom>Непрозрачность: {(layer.opacity * 100).toFixed(0)}%</Typography>
                        <Slider value={layer.opacity} step={0.01} min={0} max={1} onChange={(e, val) => changeOpacity(index, val as number)} />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <Typography gutterBottom>Режим наложения</Typography>
                        <Tooltip title={blendModeTooltips[layer.blendMode]} arrow placement="right">
                            <Select
                                value={layer.blendMode}
                                onChange={e => changeBlendMode(index, e.target.value as BlendMode)}
                                fullWidth
                            >
                                {Object.keys(blendModeTooltips).map(mode => (
                                    <MenuItem key={mode} value={mode}>
                                        {mode}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Tooltip>
                    </Box>
                </Box>
            ))}
            <Button variant="contained" onClick={() => setAddDialogOpen(true)} disabled={layers.length >= maxLayers || loading}>
                {loading ? 'Загрузка...' : 'Добавить слой'}
            </Button>
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                <DialogTitle>Добавить слой</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
                    <TextField label="Название слоя" value={newLayerName} onChange={e => setNewLayerName(e.target.value)} />
                    <Button component="label" variant="outlined" disabled={loading}>
                        Загрузить изображение (.png, .jpg, .gb7)
                        <input type="file" accept="image/*,.gb7" hidden onChange={e => { if (e.target.files) setFileInput(e.target.files[0]) }} />
                    </Button>
                    <Typography>ИЛИ</Typography>
                    <TextField type="color" label="Цвет заполнения" value={colorFill} onChange={e => setColorFill(e.target.value)} disabled={loading} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)} disabled={loading}>Отмена</Button>
                    <Button onClick={handleAddLayer} variant="contained" disabled={loading}>{loading ? 'Загрузка...' : 'Добавить'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LayerManager;