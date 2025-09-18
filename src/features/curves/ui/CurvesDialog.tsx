//@ts-nocheck


import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Checkbox,
    FormControlLabel,
    TextField,
    Box,
} from '@mui/material';

import { type Layer } from '../../layers/ui/LayerManager';

interface CurvesDialogProps {
    open: boolean;
    onClose: () => void;
    activeLayer: Layer | null;
    channel: 'red' | 'green' | 'blue' | 'alpha' | 'rgb';
    onApply: (correctedImageData: ImageData, newCurvesData: { x0: number; y0: number; x1: number; y1: number }) => void;
    initialCurves?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

const WIDTH = 256;
const HEIGHT = 256;

function calculateHistogram(imageData: ImageData, channel: 'red' | 'green' | 'blue' | 'alpha' | 'rgb') {
    const bins = new Array(256).fill(0);
    const data = imageData.data;
    const length = data.length / 4;

    if (channel === 'rgb') {
        for (let i = 0; i < length; i++) {
            bins[data[i * 4]]++;
            bins[data[i * 4 + 1]]++;
            bins[data[i * 4 + 2]]++;
        }
    } else {
        const offset = { red: 0, green: 1, blue: 2, alpha: 3 }[channel];
        for (let i = 0; i < length; i++) {
            bins[data[i * 4 + offset]]++;
        }
    }
    return bins;
}

function buildLUT(x0: number, y0: number, x1: number, y1: number) {
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i <= 255; i++) {
        if (i <= x0) lut[i] = Math.round((i / x0) * y0);
        else if (i <= x1) lut[i] = Math.round(y0 + ((i - x0) * (y1 - y0)) / (x1 - x0));
        else lut[i] = Math.round(y1 + ((i - x1) * (255 - y1)) / (255 - x1));
        lut[i] = Math.min(255, Math.max(0, lut[i]));
    }
    return lut;
}

function applyLUT(imageData: ImageData, lut: Uint8ClampedArray, channel: 'red' | 'green' | 'blue' | 'alpha' | 'rgb') {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (channel === 'rgb') {
            data[i] = lut[data[i]];
            data[i + 1] = lut[data[i + 1]];
            data[i + 2] = lut[data[i + 2]];
        } else {
            const offset = { red: 0, green: 1, blue: 2, alpha: 3 }[channel];
            data[i + offset] = lut[data[i + offset]];
        }
    }
    return imageData;
}

export const CurvesDialog: React.FC<CurvesDialogProps> = ({ open, onClose, activeLayer, channel, onApply, initialCurves }) => {
    const [x0, setX0] = useState(initialCurves?.x0 ?? 0);
    const [y0, setY0] = useState(initialCurves?.y0 ?? 0);
    const [x1, setX1] = useState(initialCurves?.x1 ?? 255);
    const [y1, setY1] = useState(initialCurves?.y1 ?? 255);
    const [preview, setPreview] = useState(false);
    const [previewData, setPreviewData] = useState<ImageData | null>(null);
    const [previewURL, setPreviewURL] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setX0(initialCurves?.x0 ?? 0);
            setY0(initialCurves?.y0 ?? 0);
            setX1(initialCurves?.x1 ?? 255);
            setY1(initialCurves?.y1 ?? 255);
        }
    }, [open, initialCurves]);

    const histograms = useMemo(() => {
        if (!activeLayer?.imageData) return [];
        const imageData = activeLayer.imageData;
        if (channel === 'rgb') {
            return [
                calculateHistogram(imageData, 'red'),
                calculateHistogram(imageData, 'green'),
                calculateHistogram(imageData, 'blue'),
            ];
        } else {
            return [calculateHistogram(imageData, channel)];
        }
    }, [activeLayer, channel]);

    useEffect(() => {
        if (!preview || !activeLayer?.imageData) {
            setPreviewData(null);
            setPreviewURL(null);
            return;
        }
        const imageData = activeLayer.imageData;
        const lut = buildLUT(x0, y0, x1, y1);
        const copy = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        applyLUT(copy, lut, channel);
        setPreviewData(copy);

        const canvas = document.createElement('canvas');
        canvas.width = copy.width;
        canvas.height = copy.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.putImageData(copy, 0, 0);
            setPreviewURL(canvas.toDataURL());
        }
    }, [x0, y0, x1, y1, preview, activeLayer, channel]);

    const handleApply = () => {
        if (!activeLayer?.imageData) {
            alert('Нет данных для применения');
            return;
        }
        const lut = buildLUT(x0, y0, x1, y1);
        const correctedData = new ImageData(
            new Uint8ClampedArray(activeLayer.imageData.data),
            activeLayer.imageData.width,
            activeLayer.imageData.height
        );
        applyLUT(correctedData, lut, channel);
        onApply(correctedData, { x0, y0, x1, y1 });
        onClose();
    };

    const handleReset = () => {
        setX0(0);
        setY0(0);
        setX1(255);
        setY1(255);
        setPreviewData(null);
        setPreviewURL(null);
    };

    const maxCount = Math.max(...histograms.flat(), 1);
    const scaleY = (value: number) => HEIGHT - (value / maxCount) * HEIGHT;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Градационная коррекция (Кривые)</DialogTitle>
            <DialogContent sx={{ userSelect: 'none' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg
                        width={WIDTH}
                        height={HEIGHT}
                        style={{ border: '1px solid #ccc', backgroundColor: '#222', touchAction: 'none' }}
                    >
                        {histograms.map((hist, idx) => (
                            <polyline
                                key={idx}
                                fill="none"
                                stroke={['red', 'green', 'blue', 'gray'][idx]}
                                strokeWidth="2"
                                points={hist.map((count, i) => `${i},${scaleY(count)}`).join(' ')}
                            />
                        ))}

                        <line x1={x0} y1={HEIGHT - y0} x2={x1} y2={HEIGHT - y1} stroke="white" strokeWidth="2" />
                        <line
                            x1={0}
                            y1={HEIGHT - y0}
                            x2={x0}
                            y2={HEIGHT - y0}
                            stroke="white"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                        />
                        <line
                            x1={x1}
                            y1={HEIGHT - y1}
                            x2={255}
                            y2={HEIGHT - y1}
                            stroke="white"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                        />
                        <circle cx={x0} cy={HEIGHT - y0} r={5} fill="yellow" />
                        <circle cx={x1} cy={HEIGHT - y1} r={5} fill="yellow" />
                    </svg>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            label="Вход X0"
                            type="number"
                            inputProps={{ min: 0, max: 255 }}
                            value={x0}
                            onChange={(e) => setX0(Math.min(255, Math.max(0, Number(e.target.value))))}
                            size="small"
                        />
                        <TextField
                            label="Выход Y0"
                            type="number"
                            inputProps={{ min: 0, max: 255 }}
                            value={y0}
                            onChange={(e) => setY0(Math.min(255, Math.max(0, Number(e.target.value))))}
                            size="small"
                        />
                        <TextField
                            label="Вход X1"
                            type="number"
                            inputProps={{ min: 0, max: 255 }}
                            value={x1}
                            onChange={(e) => setX1(Math.min(255, Math.max(0, Number(e.target.value))))}
                            size="small"
                        />
                        <TextField
                            label="Выход Y1"
                            type="number"
                            inputProps={{ min: 0, max: 255 }}
                            value={y1}
                            onChange={(e) => setY1(Math.min(255, Math.max(0, Number(e.target.value))))}
                            size="small"
                        />
                    </Box>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={preview}
                                onChange={(e) => setPreview(e.target.checked)}
                            />
                        }
                        label="Предпросмотр"
                        sx={{ mt: 2 }}
                    />


                    {previewURL && (
                        <Box sx={{ mt: 2 }}>
                            <img
                                alt="preview"
                                src={previewURL}
                                style={{ maxWidth: '100%', border: '1px solid #ccc' }}
                            />
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleApply} variant="contained">Применить</Button>
                <Button onClick={handleReset}>Сбросить</Button>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogActions>
        </Dialog>
    );
};