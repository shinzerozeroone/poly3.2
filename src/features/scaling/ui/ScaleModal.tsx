import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    Tooltip,
    Typography,
    InputLabel,
    FormControl,
} from '@mui/material';

interface ScaleModalProps {
    open: boolean;
    onClose: () => void;
    imageInfo: { width: number; height: number } | null;
    onApply: (
        newWidth: number,
        newHeight: number,
        interpolation: 'nearest' | 'bilinear'
    ) => void;
}

const interpolationInfo = {
    nearest:
        'Метод ближайшего соседа - простой и быстрый, но с заметной пикселизацией.',
    bilinear:
        'Билинейная интерполяция - более плавное изображение, но требует больше ресурсов.',
};

const ScaleModal: React.FC<ScaleModalProps> = ({
    open,
    onClose,
    imageInfo,
    onApply,
}) => {
    const [width, setWidth] = useState<number | ''>('');
    const [height, setHeight] = useState<number | ''>('');
    const [lockAspect, setLockAspect] = useState(true);
    const [interpolation, setInterpolation] = useState<'nearest' | 'bilinear'>(
        'bilinear'
    );
    const [scaleType, setScaleType] = useState<'percent' | 'pixel'>('percent');
    const [scaleValue, setScaleValue] = useState<number | ''>(100);

    useEffect(() => {
        if (imageInfo) {
            setWidth(imageInfo.width);
            setHeight(imageInfo.height);
            setScaleValue(100);
        }
    }, [imageInfo, open]);

    const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

    const handleScaleChange = (value: number) => {
        if (scaleType === 'percent' && imageInfo) {
            const newWidth = Math.round((imageInfo.width * value) / 100);
            const newHeight = lockAspect ? Math.round(newWidth / aspectRatio) : height;
            setWidth(newWidth);
            setHeight(newHeight === undefined ? '' : newHeight);
            setScaleValue(value);
        } else if (scaleType === 'pixel') {
            setWidth(value);
            if (lockAspect) {
                setHeight(Math.round(value / aspectRatio));
            }
            if (imageInfo) {
                setScaleValue(Math.round((value / imageInfo.width) * 100));
            }
        }
    };

    const handleWidthChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const val = e.target.value === '' ? '' : parseInt(e.target.value);
        if (val === '' || (typeof val === 'number' && val > 0)) {
            setWidth(val);
            if (lockAspect && imageInfo && typeof val === 'number') {
                setHeight(Math.round(val / aspectRatio));
                setScaleValue(Math.round((val / imageInfo.width) * 100));
            }
        }
    };

    const handleHeightChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const val = e.target.value === '' ? '' : parseInt(e.target.value);
        if (val === '' || (typeof val === 'number' && val > 0)) {
            setHeight(val);
            if (lockAspect && imageInfo && typeof val === 'number') {
                setWidth(Math.round(val * aspectRatio));
                setScaleValue(Math.round(((val * aspectRatio) / imageInfo.width) * 100));
            }
        }
    };

    const handleApply = () => {
        if (typeof width === 'number' && typeof height === 'number') {
            onApply(width, height, interpolation);
            onClose();
        }
    };

    if (!imageInfo) return null;

    const originalPixels = (imageInfo.width * imageInfo.height) / 1_000_000;
    const newPixels =
        typeof width === 'number' && typeof height === 'number'
            ? (width * height) / 1_000_000
            : 0;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Изменение размера изображения</DialogTitle>
            <DialogContent>
                <Typography>
                    Исходное количество пикселей: {originalPixels.toFixed(2)} Мп
                </Typography>
                <Typography>Новое количество пикселей: {newPixels.toFixed(2)} Мп</Typography>

                <FormControl fullWidth margin="normal">
                    <InputLabel>Тип масштабирования</InputLabel>
                    <Select
                        value={scaleType}
                        onChange={(e) => setScaleType(e.target.value as 'percent' | 'pixel')}
                        label="Тип масштабирования"
                    >
                        <MenuItem value="percent">Проценты</MenuItem>
                        <MenuItem value="pixel">Пиксели</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label={scaleType === 'percent' ? 'Масштаб %' : 'Ширина, px'}
                    type="number"
                    fullWidth
                    value={scaleType === 'percent' ? scaleValue : width}
                    onChange={(e) =>
                        scaleType === 'percent'
                            ? handleScaleChange(Number(e.target.value))
                            : handleWidthChange(e)
                    }
                    margin="normal"
                    inputProps={{ min: 0 }}
                />

                {scaleType === 'pixel' && (
                    <TextField
                        label="Высота, px"
                        type="number"
                        fullWidth
                        value={height}
                        onChange={handleHeightChange}
                        margin="normal"
                        inputProps={{ min: 0 }}
                    />
                )}

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={lockAspect}
                            onChange={() => setLockAspect(!lockAspect)}
                        />
                    }
                    label="Сохранять пропорции"
                />

                <FormControl fullWidth margin="normal">
                    <InputLabel>Метод интерполяции</InputLabel>
                    <Select
                        value={interpolation}
                        onChange={(e) =>
                            setInterpolation(e.target.value as 'nearest' | 'bilinear')
                        }
                        label="Метод интерполяции"
                    >
                        <MenuItem value="nearest">Ближайший сосед</MenuItem>
                        <MenuItem value="bilinear">Билинейный</MenuItem>
                    </Select>
                </FormControl>

                <Tooltip title={interpolationInfo[interpolation]} arrow>
                    <Typography variant="body2" color="textSecondary" mt={1}>
                        {interpolationInfo[interpolation]}
                    </Typography>
                </Tooltip>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button
                    variant="contained"
                    onClick={handleApply}
                    disabled={
                        width === '' ||
                        height === '' ||
                        Number(width) <= 0 ||
                        Number(height) <= 0
                    }
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ScaleModal;
