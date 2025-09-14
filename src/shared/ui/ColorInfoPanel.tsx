import { type FC } from 'react';
import {
    Box,
    Typography,
    Paper,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    type ColorInfo,
    getContrastRatio,
    isAccessible,
} from '../../entities/color/model/colorUtils';

interface ColorInfoPanelProps {
    color1: ColorInfo;
    color2: ColorInfo;
}

const ColorInfoPanel: FC<ColorInfoPanelProps> = ({ color1, color2 }) => {
    // Вычисление контраста и метки
    const contrastRatio = getContrastRatio(color1.rgb, color2.rgb);
    const contrastLabel = isAccessible(contrastRatio) ? 'Достаточный' : 'Недостаточный';

    const renderColorBlock = (color: ColorInfo, label: string) => (
        <Box sx={{ flex: '1 1 50%', p: 1 }}>
            <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">{label}</Typography>
                <Box
                    sx={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        margin: '10px auto',
                        border: '1px solid #000',
                        bgcolor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                    }}
                />
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Координаты: ({color.x}, {color.y})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Tooltip
                        title="Красный, Зеленый, Синий (от 0 до 255). Аддитивная модель для экранов."
                        arrow
                    >
                        <Typography variant="body2">
                            **RGB:** R:{color.rgb.r}, G:{color.rgb.g}, B:{color.rgb.b}
                        </Typography>
                    </Tooltip>
                    <Tooltip
                        title="Светлота, тон, насыщенность (от 0 до 100, -128 до 127). Перцептивно-равномерное пространство."
                        arrow
                    >
                        <Typography variant="body2">
                            **Lab:** L:{color.lab.l.toFixed(2)}, a:{color.lab.a.toFixed(2)}, b:{color.lab.b.toFixed(2)}
                        </Typography>
                    </Tooltip>
                    <Tooltip
                        title="Светлота, насыщенность, оттенок (L от 0 до 100). Цилиндрическая версия Lab."
                        arrow
                    >
                        <Typography variant="body2">
                            **LCH:** L:{color.lch.l.toFixed(2)}, C:{color.lch.c.toFixed(2)}, H:{color.lch.h.toFixed(2)}
                        </Typography>
                    </Tooltip>
                    <Tooltip
                        title="Перцептивно-равномерная версия LCH (L от 0 до 100)."
                        arrow
                    >
                        <Typography variant="body2">
                            **OKLch:** L:{color.oklch.l.toFixed(2)}, C:{color.oklch.c.toFixed(2)}, H:{color.oklch.h.toFixed(2)}
                        </Typography>
                    </Tooltip>
                </Box>
            </Paper>
        </Box>
    );

    return (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>
                Информация о цвете
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                {renderColorBlock(color1, 'Цвет 1')}
                {renderColorBlock(color2, 'Цвет 2')}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                    Контраст: {contrastRatio.toFixed(2)}:1
                </Typography>
                <Typography variant="body1" color={isAccessible(contrastRatio) ? 'success.main' : 'error.main'}>
                    ({contrastLabel})
                </Typography>
            </Box>
        </Box>
    );
};

export default ColorInfoPanel;