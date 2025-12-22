import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const Button = ({ children, fullWidth = true, style, ...props }: ButtonProps) => (
  <button
    {...props}
    style={{
      padding: '0.85rem 1rem',
      borderRadius: '999px',
      border: 'none',
      background: props.disabled ? '#98a2b3' : '#0f766e',
      color: '#fff',
      fontWeight: 600,
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      width: fullWidth ? '100%' : undefined,
      ...style
    }}
  >
    {children}
  </button>
);
