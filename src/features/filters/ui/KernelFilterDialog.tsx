import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Typography,
    Box
} from '@mui/material';

import type { Layer } from '../../layers/ui/LayerManager';

interface KernelFilterDialogProps {
    open: boolean;
    onClose: () => void;
    activeLayer: Layer | null;
    onApply: (imageData: ImageData, kernel: number[][]) => void;
}

const predefinedKernels = {
    identity: { name: 'Тождественное', values: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
    sharpen: { name: 'Повышение резкости', values: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
    gaussianBlur: { name: 'Размытие по Гауссу', values: [[1 / 16, 2 / 16, 1 / 16], [2 / 16, 4 / 16, 2 / 16], [1 / 16, 2 / 16, 1 / 16]] },
    boxBlur: { name: 'Прямоугольное размытие', values: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]] },
    prewittX: { name: 'Оператор Прюитта (X)', values: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
    prewittY: { name: 'Оператор Прюитта (Y)', values: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] },
};

const KernelFilterDialog: React.FC<KernelFilterDialogProps> = ({ open, onClose, activeLayer, onApply }) => {
    const [kernel, setKernel] = useState<number[][]>(predefinedKernels.identity.values);
    const [selectedKernel, setSelectedKernel] = useState<string>('identity');
    const [previewEnabled, setPreviewEnabled] = useState(false);

    useEffect(() => {
        if (open) {
            setKernel(predefinedKernels.identity.values);
            setSelectedKernel('identity');
        }
    }, [open]);

    const handleKernelChange = (row: number, col: number, value: string) => {
        const newKernel = [...kernel];
        newKernel[row][col] = parseFloat(value) || 0;
        setKernel(newKernel);
    };

    const handlePredefinedKernelChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const key = event.target.value as string;
        setSelectedKernel(key);
        setKernel(predefinedKernels[key as keyof typeof predefinedKernels].values);
    };

    useEffect(() => {
        if (!previewEnabled || !activeLayer?.imageData) return;
        // Здесь будет логика для предпросмотра
    }, [kernel, previewEnabled, activeLayer?.imageData]);

    const handleApply = () => {
        if (!activeLayer?.imageData) return;
        onApply(activeLayer.imageData, kernel);
        onClose();
    };

    const handleReset = () => {
        setKernel(predefinedKernels.identity.values);
        setSelectedKernel('identity');
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Фильтрация с использованием ядра</DialogTitle>
            <DialogContent>
                <Box sx={{ minWidth: 400, mb: 2 }}>
                    <Typography gutterBottom>
                        Выберите предустановленное ядро или измените значения вручную.
                    </Typography>
                    <Select
                        value={selectedKernel}
                        onChange={handlePredefinedKernelChange as any}
                        fullWidth
                    >
                        {Object.entries(predefinedKernels).map(([key, value]) => (
                            <MenuItem key={key} value={key}>{value.name}</MenuItem>
                        ))}
                    </Select>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                    {[0, 1, 2].map(row => (
                        <Box key={row} sx={{ display: 'flex', gap: 1 }}>
                            {[0, 1, 2].map(col => (
                                <TextField
                                    key={`${row}-${col}`}
                                    type="number"
                                    size="small"
                                    value={kernel[row][col]}
                                    onChange={e => handleKernelChange(row, col, e.target.value)}
                                />
                            ))}
                        </Box>
                    ))}
                </Box>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={previewEnabled}
                            onChange={(e) => setPreviewEnabled(e.target.checked)}
                        />
                    }
                    label="Предпросмотр"
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleReset}>Сбросить</Button>
                <Button onClick={onClose}>Отмена</Button>
                <Button onClick={handleApply} variant="contained" color="primary" disabled={!activeLayer}>Применить</Button>
            </DialogActions>
        </Dialog>
    );
};

export default KernelFilterDialog;