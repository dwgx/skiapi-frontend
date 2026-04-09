import React from 'react';
import { TableRow, TableCell, Skeleton } from '@mui/material';

/**
 * Skeleton rows for tables with varied widths for visual variety.
 */
export default function TableSkeleton({ rows = 5, columns = 6, widths }) {
  const defaultWidths = widths || Array.from({ length: columns }, (_, i) =>
    i === 0 ? '30%' : i === columns - 1 ? '20%' : `${40 + Math.random() * 40}%`
  );

  return Array.from({ length: rows }).map((_, ri) => (
    <TableRow key={ri}>
      {Array.from({ length: columns }).map((_, ci) => (
        <TableCell key={ci}>
          <Skeleton variant="text" width={defaultWidths[ci % defaultWidths.length]} height={20} />
        </TableCell>
      ))}
    </TableRow>
  ));
}
