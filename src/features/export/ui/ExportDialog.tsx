import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography
} from '@mui/material';

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    onExportPng: () => void;
    onExportJpg: () => void;
    onExportGb7: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, onExportPng, onExportJpg, onExportGb7 }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Экспорт изображения</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>Выберите формат для сохранения:</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={onExportPng}
                        fullWidth
                    >
                        Сохранить как PNG
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onExportJpg}
                        fullWidth
                    >
                        Сохранить как JPG
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onExportGb7}
                        fullWidth
                    >
                        Сохранить как GB7
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Отмена
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ExportDialog;