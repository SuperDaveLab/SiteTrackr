import { HTMLAttributes } from 'react';
import './common.css';

export type BadgeVariant = 'primary' | 'muted' | 'warning' | 'danger' | 'success';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ variant = 'primary', className, ...props }: BadgeProps) => (
  <span
    {...props}
    data-variant={variant}
    className={['ui-badge', className].filter(Boolean).join(' ')}
  />
);
