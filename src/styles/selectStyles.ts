// Common styles for react-select dropdowns with dark mode support
export const getCustomSelectStyles = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return {
        control: (base: any) => ({
            ...base,
            fontSize: '14px',
            minHeight: '38px',
            backgroundColor: isDark ? '#1a1e23' : 'white',
            borderColor: isDark ? '#374151' : '#d1d5db',
            color: isDark ? '#f9fafb' : '#1e293b',
            '&:hover': {
                borderColor: isDark ? '#4b5563' : '#011926'
            }
        }),
        option: (base: any, state: any) => ({
            ...base,
            fontSize: '14px',
            backgroundColor: state.isSelected 
                ? '#83cee4' 
                : state.isFocused 
                    ? (isDark ? '#374151' : '#f1f5f9') 
                    : (isDark ? '#1a1e23' : 'white'),
            color: state.isSelected ? '#011926' : (isDark ? '#f9fafb' : '#1e293b'),
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
            color: isDark ? '#f9fafb' : '#1e293b'
        }),
        placeholder: (base: any) => ({
            ...base,
            fontSize: '14px',
            color: isDark ? '#9ca3af' : '#9ca3af'
        }),
        menu: (base: any) => ({
            ...base,
            fontSize: '14px',
            backgroundColor: isDark ? '#1a1e23' : 'white',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            boxShadow: isDark 
                ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                : '0 4px 12px rgba(0, 0, 0, 0.1)'
        })
    };
};

