import React from 'react';
import Select, { StylesConfig, MultiValue } from 'react-select';

interface DropdownOption {
    value: any;
    label: string;
}

interface CommonMultiSelectProps {
    value: any[];
    onChange: (value: any[]) => void;
    options: DropdownOption[];
    placeholder?: string;
    isSearchable?: boolean;
    className?: string;
    menuPlacement?: 'auto' | 'top' | 'bottom';
    size?: 'sm' | 'md';
    disabled?: boolean;
    onInputChange?: (value: string) => void;
}

const CommonMultiSelect: React.FC<CommonMultiSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    isSearchable = false,
    className = '',
    menuPlacement = 'auto',
    size = 'sm',
    disabled = false,
    onInputChange
}) => {
    const customStyles: StylesConfig<DropdownOption, true> = {
        control: (provided, state) => ({
            ...provided,
            minHeight: size === 'sm' ? '28px' : '38px',
            fontSize: size === 'sm' ? '11px' : '13px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#cbd5e1'
            },
            '&:focus-within': {
                borderColor: '#83cee4',
                boxShadow: '0 0 0 3px rgba(131, 206, 228, 0.1)'
            },
            backgroundColor: disabled ? '#f3f4f6' : 'white',
            cursor: disabled ? 'not-allowed' : 'default'
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '2px 8px'
        }),
        input: (provided) => ({
            ...provided,
            margin: '0px',
            color: '#1e293b' // ensure visibility (slate-800)
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: size === 'sm' ? '28px' : '38px'
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 9999
        }),
        menuPortal: (provided) => ({
            ...provided,
            zIndex: 9999
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
        }),
        multiValue: (styles) => ({
            ...styles,
            backgroundColor: '#e2f3f9',
            borderRadius: '4px',
        }),
        multiValueLabel: (styles) => ({
            ...styles,
            color: '#011926',
            fontSize: size === 'sm' ? '11px' : '12px',
        }),
        multiValueRemove: (styles) => ({
            ...styles,
            color: '#011926',
            ':hover': {
                backgroundColor: '#83cee4',
                color: 'white',
            },
        }),
    };

    const selectedOptions = options.filter(option => value.includes(option.value));

    const handleChange = (newValue: MultiValue<DropdownOption>) => {
        onChange(newValue.map(item => item.value));
    };

    return (
        <Select
            isMulti
            value={selectedOptions}
            onChange={handleChange}
            options={options}
            styles={customStyles}
            isSearchable={isSearchable}
            className={className}
            menuPlacement={menuPlacement}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            placeholder={placeholder}
            isDisabled={disabled}
            closeMenuOnSelect={false}
            onInputChange={onInputChange}
        />
    );
};

export default CommonMultiSelect;
