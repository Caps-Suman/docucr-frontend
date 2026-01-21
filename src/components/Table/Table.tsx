import React from 'react';
import styles from './Table.module.css';

interface Column {
    key: string;
    header: string | React.ReactNode;
    render?: (value: any, row: any) => React.ReactNode;
    width?: string;
}

interface TableProps {
    columns: Column[];
    data: any[];
    className?: string;
    maxHeight?: string;
    stickyHeader?: boolean;
}

const Table: React.FC<TableProps> = ({ columns, data, className = '', maxHeight, stickyHeader = true }) => {
    return (
        <div
            className={`${styles.container} ${className}`}
            style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
        >
            <table className={`${styles.table} ${stickyHeader ? styles.stickyHeader : ''}`}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} style={{ width: column.width }}>{column.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className={styles.empty}>
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => (
                            <tr key={index}>
                                {columns.map((column) => (
                                    <td key={column.key}>
                                        {column.render
                                            ? column.render(row[column.key], row)
                                            : row[column.key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;