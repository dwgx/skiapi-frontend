import React from 'react';
import { TextField, InputAdornment, IconButton, Tooltip, Stack } from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * M3 search bar with Enter-to-search, refresh button, and optional filter slot.
 */
export default function SearchBar({
  value, onChange, onSearch, onRefresh,
  placeholder, filters, sx,
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('搜索...');
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={sx}>
      {filters}
      <TextField
        size="small"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch?.()}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 200 }}
      />
      {onRefresh && (
        <Tooltip title={t('刷新')}>
          <IconButton onClick={onRefresh} size="small" sx={{ border: 1, borderColor: 'divider' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
