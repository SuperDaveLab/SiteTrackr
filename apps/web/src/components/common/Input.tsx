import { InputHTMLAttributes } from 'react';
import './common.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const Input = ({ label, containerClassName, className, style, ...props }: InputProps) => (
  <label className={['ui-input-group', containerClassName].filter(Boolean).join(' ')}>
    {label}
    <input
      {...props}
      className={['ui-input', className].filter(Boolean).join(' ')}
      style={style}
    />
  </label>
);
