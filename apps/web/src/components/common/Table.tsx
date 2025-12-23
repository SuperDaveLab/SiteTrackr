import { TableHTMLAttributes } from 'react';
import './common.css';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const Table = ({ wrapperClassName, className, children, ...props }: TableProps) => (
  <div className={['ui-table-shell', wrapperClassName].filter(Boolean).join(' ')}>
    <table {...props} className={['ui-table', className].filter(Boolean).join(' ')}>
      {children}
    </table>
  </div>
);
