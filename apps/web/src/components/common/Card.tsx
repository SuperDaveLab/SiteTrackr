import { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  maxWidth?: number | string;
  style?: CSSProperties;
}

export const Card = ({ children, maxWidth = '100%', style }: CardProps) => (
  <div
    style={{
      width: '100%',
      maxWidth,
      borderRadius: '1rem',
      padding: '1.5rem',
      background: '#fff',
      boxShadow: '0 20px 40px rgba(15, 15, 15, 0.08)',
      ...style
    }}
  >
    {children}
  </div>
);
