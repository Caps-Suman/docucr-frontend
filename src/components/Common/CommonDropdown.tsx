import React from 'react';
import Select, { StylesConfig } from 'react-select';

interface DropdownOption {
    value: any;
    label: string;
}

interface CommonDropdownProps {
    value: any;
    onChange: (value: any) => void;
    options: DropdownOption[];
    placeholder?: string;
    isSearchable?: boolean;
    className?: string;
    menuPlacement?: 'auto' | 'top' | 'bottom';
    size?: 'sm' | 'md';
}

const CommonDropdown: React.FC<CommonDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    isSearchable = false,
    className = '',
    menuPlacement = 'auto',
    size = 'sm'
}) => {
    const customStyles: StylesConfig = {
        control: (provided, state) => ({
            ...provided,
            minHeight: size === 'sm' ? '28px' : '36px',
            height: size === 'sm' ? '28px' : '36px',
            fontSize: size === 'sm' ? '11px' : '13px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#cbd5e1'
            }
        }),
        valueContainer: (provided) => ({
            ...provided,
            height: size === 'sm' ? '28px' : '36px',
            padding: '0 6px'
        }),
        input: (provided) => ({
            ...provided,
            margin: '0px'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: size === 'sm' ? '28px' : '36px'
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }),
        menuList: (provided) => ({
            ...provided,
            padding: '4px',
            borderRadius: '6px'
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: size === 'sm' ? '11px' : '13px',
            padding: size === 'sm' ? '6px 8px' : '8px 10px',
            borderRadius: '4px',
            backgroundColor: state.isSelected ? '#83cee4' : state.isFocused ? '#f8fafc' : 'transparent',
            color: state.isSelected ? '#011926' : '#64748b',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: '#83cee4'
            }
        })
    };

    return (
        <Select
            value={options.find(option => option.value === value)}
            onChange={(option) => option && onChange((option as DropdownOption).value)}
            options={options}
            styles={customStyles}
            isSearchable={isSearchable}
            className={className}
            menuPlacement={menuPlacement}
            placeholder={placeholder}
        />
    );
};

export default CommonDropdown;
