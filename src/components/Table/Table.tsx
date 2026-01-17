import React from 'react';
import styles from './Table.module.css';

interface Column {
    key: string;
    header: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
    columns: Column[];
    data: any[];
    className?: string;
}

const Table: React.FC<TableProps> = ({ columns, data, className = '' }) => {
    return (
        <div className={`${styles.container} ${className}`}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.header}</th>
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