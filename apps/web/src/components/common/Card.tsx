import { CSSProperties, ReactNode } from 'react';
import './common.css';

interface CardProps {
  children: ReactNode;
  maxWidth?: number | string;
  className?: string;
  style?: CSSProperties;
}

export const Card = ({ children, maxWidth = '100%', className, style }: CardProps) => (
  <div
    className={['ui-card', className].filter(Boolean).join(' ')}
    style={{ maxWidth, ...style }}
  >
    {children}
  </div>
);
