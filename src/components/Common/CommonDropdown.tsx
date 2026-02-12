import Select, { StylesConfig, components, ValueContainerProps } from 'react-select';

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
    isMulti?: boolean;
    className?: string;
    menuPlacement?: 'auto' | 'top' | 'bottom';
    size?: 'sm' | 'md';
    disabled?: boolean;
    loading?: boolean;
}

const ValueContainer = ({ children, ...props }: ValueContainerProps<DropdownOption, true>) => {
    const { getValue, hasValue } = props;
    const nbValues = getValue().length;
    if (!hasValue || !props.isMulti || nbValues <= 10) {
        return (
            <components.ValueContainer {...props}>
                {children}
            </components.ValueContainer>
        );
    }

    // children[0] is the array of MultiValue components
    // children[1] is the placeholder/input
    const [values, input] = children as any;
    const shownValues = values.slice(0, 10);
    const hiddenCount = nbValues - 10;

    return (
        <components.ValueContainer {...props}>
            {shownValues}
            <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '4px',
                whiteSpace: 'nowrap'
            }}>
                +{hiddenCount} more
            </div>
            {input}
        </components.ValueContainer>
    );
};

const CommonDropdown: React.FC<CommonDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    isSearchable = false,
    isMulti = false,
    className = '',
    menuPlacement = 'auto',
    size = 'sm',
    disabled = false,
    loading = false
}) => {
    const customStyles: StylesConfig<DropdownOption, boolean> = {
        control: (provided, state) => ({
            ...provided,
            minHeight: size === 'sm' ? '28px' : '38px',
            height: isMulti ? 'auto' : (size === 'sm' ? '28px' : '38px'),
            fontSize: size === 'sm' ? '11px' : '13px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: 'none',
            backgroundColor: disabled ? '#f3f4f6' : 'white',
            '&:hover': {
                borderColor: '#cbd5e1'
            },
            '&:focus-within': {
                borderColor: '#83cee4',
                boxShadow: '0 0 0 3px rgba(131, 206, 228, 0.1)'
            }
        }),
        valueContainer: (provided) => ({
            ...provided,
            minHeight: size === 'sm' ? '28px' : '38px',
            height: isMulti ? 'auto' : (size === 'sm' ? '28px' : '38px'),
            padding: isMulti ? '2px 12px' : '0 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px'
        }),
        input: (provided) => ({
            ...provided,
            margin: '0px',
            padding: '0px'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: isMulti ? 'auto' : (size === 'sm' ? '28px' : '38px'),
            alignSelf: 'stretch'
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: '#e2f3f9',
            borderRadius: '4px',
            margin: '2px 0',
            border: '1px solid #83cee4',
            display: 'flex',
            alignItems: 'center'
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#011926',
            fontSize: '11px',
            fontWeight: 600,
            padding: '1px 6px'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#011926',
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
                backgroundColor: '#83cee4',
                color: '#011926',
                borderRadius: '0 3px 3px 0'
            }
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
        })
    };

    return (
        <Select
            value={
                isMulti
                    ? options.filter((option) => (value || []).includes(option.value))
                    : options.find((option) => option.value === value)
            }
            onChange={(selected: any) => {
                if (isMulti) {
                    const selectedOptions = (selected || []) as DropdownOption[];
                    onChange(selectedOptions.map((opt) => opt.value));
                } else {
                    const selectedOption = selected as DropdownOption;
                    onChange(selectedOption ? selectedOption.value : null);
                }
            }}
            options={options}
            isMulti={isMulti as any}
            components={{ ValueContainer }}
            styles={customStyles}
            isSearchable={isSearchable}
            closeMenuOnSelect={!isMulti}
            className={className}
            menuPlacement={menuPlacement}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            placeholder={placeholder}
            isLoading={loading}
            isDisabled={disabled}
        />
    );
};

export default CommonDropdown;
