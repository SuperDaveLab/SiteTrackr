import { ButtonHTMLAttributes } from 'react';
import './common.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  className?: string;
  variant?: 'primary' | 'ghost';
}

export const Button = ({ children, fullWidth = true, className, variant = 'primary', style, ...props }: ButtonProps) => (
  <button
    {...props}
    className={['ui-button', variant === 'ghost' ? 'ui-button--ghost' : undefined, className]
      .filter(Boolean)
      .join(' ')}
    style={{ width: fullWidth ? '100%' : undefined, ...style }}
  >
    {children}
  </button>
);
