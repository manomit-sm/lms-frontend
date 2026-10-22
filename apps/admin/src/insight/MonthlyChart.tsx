import { formatAmount } from '@lms/ui';
import { Text, Tooltip } from '@mantine/core';
import type { CSSProperties } from 'react';
import classes from './MonthlyChart.module.css';

export interface MonthPoint {
  /** `2026-01` */
  month: string;
  daysTaken: number;
  /** Shown in the tooltip under the value, e.g. requests submitted. */
  detail?: string;
}

function monthName(month: string, style: 'short' | 'long'): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(year!, number! - 1, 1).toLocaleDateString(undefined, {
    month: style,
    ...(style === 'long' ? { year: 'numeric' } : {}),
  });
}

/** Leave days taken per month: one series, so no legend; each column has a tooltip and a label. */
export function MonthlyChart({ months }: { months: readonly MonthPoint[] }) {
  const max = Math.max(...months.map((point) => point.daysTaken), 0) || 1;
  const style = { '--columns': months.length } as CSSProperties;
  return (
    <div>
      <div className={classes.chart} style={style} role="list" aria-label="Leave days taken per month">
        {months.map((point) => {
          const label = `${monthName(point.month, 'long')}: ${formatAmount(point.daysTaken)} days`;
          return (
            <Tooltip
              key={point.month}
              withinPortal
              label={
                <>
                  <div>{label}</div>
                  {point.detail && <div style={{ opacity: 0.8 }}>{point.detail}</div>}
                </>
              }
            >
              <div className={classes.column} role="listitem" tabIndex={0} aria-label={label}>
                {/* Only the peak is labelled: the scale, without a number on every bar */}
                {point.daysTaken > 0 && point.daysTaken === max && (
                  <Text size="xs" fw={600} className={classes.peak} aria-hidden>
                    {formatAmount(point.daysTaken)}
                  </Text>
                )}
                <div className={classes.bar} style={{ height: `${(point.daysTaken / max) * 100}%` }} />
              </div>
            </Tooltip>
          );
        })}
      </div>
      <div className={classes.labels} style={style} aria-hidden>
        {months.map((point) => (
          <Text key={point.month} size="xs" c="dimmed" truncate>
            {monthName(point.month, 'short')}
          </Text>
        ))}
      </div>
    </div>
  );
}
