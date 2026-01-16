// Common styles for react-select dropdowns
export const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        fontSize: '14px',
        minHeight: '38px',
        borderColor: '#d1d5db',
        '&:hover': {
            borderColor: '#011926'
        }
    }),
    option: (base: any, state: any) => ({
        ...base,
        fontSize: '14px',
        backgroundColor: state.isSelected ? '#83cee4' : state.isFocused ? '#f1f5f9' : 'white',
        color: state.isSelected ? '#011926' : '#1e293b',
        cursor: 'pointer'
    }),
    multiValue: (base: any) => ({
        ...base,
        backgroundColor: '#83cee4',
        fontSize: '13px'
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        color: '#011926',
        fontSize: '13px'
    }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: '#011926',
        ':hover': {
            backgroundColor: '#5bc0db',
            color: '#011926'
        }
    }),
    singleValue: (base: any) => ({
        ...base,
        fontSize: '14px',
        color: '#1e293b'
    }),
    placeholder: (base: any) => ({
        ...base,
        fontSize: '14px',
        color: '#9ca3af'
    }),
    menu: (base: any) => ({
        ...base,
        fontSize: '14px'
    })
};
