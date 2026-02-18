import { useState, useEffect } from 'react';

/**
 * Debounce utility function to delay function execution
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns - A debounced version of the function
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

/**
 * Custom hook for debounced value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns - The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
