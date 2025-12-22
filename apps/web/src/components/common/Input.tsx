import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, style, ...props }: InputProps) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem', color: '#1d2939' }}>
    {label}
    <input
      {...props}
      style={{
        padding: '0.85rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid #d0d5dd',
        fontSize: '1rem',
        ...style
      }}
    />
  </label>
);
