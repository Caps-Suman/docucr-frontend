import React from 'react';
import { createPortal } from 'react-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import styles from './CommonPagination.module.css';

interface CommonPaginationProps {
    show: boolean;
    pageCount: number;
    currentPage?: number;
    onPageChange: (selectedItem: { selected: number }) => void;
    totalItems?: number;
    itemsPerPage?: number;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
    renderInPlace?: boolean;
}

const CommonPagination: React.FC<CommonPaginationProps> = ({
    show,
    pageCount,
    currentPage = 0,
    onPageChange,
    totalItems,
    itemsPerPage = 10,
    onItemsPerPageChange,
    renderInPlace = false
}) => {
    // Simplified portal target lookup
    const target = document.getElementById('pagination-target');

    if (!show || (!target && !renderInPlace)) return null;

    const startItem = currentPage * itemsPerPage + 1;
    const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems || 0);

    const itemsPerPageOptions = [
        { value: 5, label: '5' },
        { value: 10, label: '10' },
        { value: 20, label: '20' },
        { value: 25, label: '25' },
        { value: 40, label: '40' },
        { value: 60, label: '60' },
        { value: 80, label: '80' },
        { value: 100, label: '100' }
    ];

    const customStyles = {
        control: (provided: any, state: any) => ({
            ...provided,
            minHeight: '28px',
            height: '28px',
            fontSize: '11px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#cbd5e1'
            }
        }),
        valueContainer: (provided: any) => ({
            ...provided,
            height: '28px',
            padding: '0 6px'
        }),
        input: (provided: any) => ({
            ...provided,
            margin: '0px'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        }),
        indicatorsContainer: (provided: any) => ({
            ...provided,
            height: '28px'
        }),
        menu: (provided: any) => ({
            ...provided,
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }),
        menuList: (provided: any) => ({
            ...provided,
            padding: '4px',
            borderRadius: '6px'
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            fontSize: '11px',
            padding: '6px 8px',
            borderRadius: '4px',
            backgroundColor: state.isSelected ? '#83cee4' : state.isFocused ? '#f8fafc' : 'transparent',
            color: state.isSelected ? '#011926' : '#64748b',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: '#83cee4'
            }
        }),
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
    };

    const content = (
        <div className={styles.container}>
            <div className={styles.left}>
                {totalItems !== undefined && (
                    <div className={styles.info}>
                        Showing {startItem}-{endItem} of {totalItems} results
                    </div>
                )}
                {onItemsPerPageChange && (
                    <div className={styles.itemsPerPage}>
                        <span className={styles.itemsPerPageLabel}>Per Page:</span>
                        <Select
                            value={itemsPerPageOptions.find(option => option.value === itemsPerPage)}
                            onChange={(option) => option && onItemsPerPageChange(option.value)}
                            options={itemsPerPageOptions}
                            styles={customStyles}
                            isSearchable={false}
                            className={styles.itemsPerPageSelect}
                            menuPlacement="auto"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                        />
                    </div>
                )}
            </div>

            {pageCount > 0 && (
                <div className={styles.center}>
                    <ReactPaginate
                        pageCount={pageCount}
                        pageRangeDisplayed={3}
                        marginPagesDisplayed={1}
                        onPageChange={onPageChange}
                        forcePage={currentPage}
                        containerClassName="pagination"
                        pageClassName="pagination-item"
                        pageLinkClassName="pagination-link"
                        activeClassName="pagination-active"
                        previousClassName="pagination-item"
                        nextClassName="pagination-item"
                        previousLinkClassName="pagination-link"
                        nextLinkClassName="pagination-link"
                        disabledClassName="pagination-disabled"
                        previousLabel="‹"
                        nextLabel="›"
                    />
                </div>
            )}
        </div>
    );

    if (renderInPlace) {
        return content;
    }

    return target ? createPortal(content, target) : null;
};

export default CommonPagination;