import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './CommonDatePicker.module.css';

interface CommonDatePickerProps {
    selected: Date | null;
    onChange: (date: Date | null) => void;
    placeholderText?: string;
    className?: string;
    isClearable?: boolean;
    minDate?: Date | null;
    maxDate?: Date | null;
    dateFormat?: string;
    disabled?: boolean;
    dateOnly?: boolean; // If true, returns date string instead of Date object
}

const CommonDatePicker: React.FC<CommonDatePickerProps> = ({
    selected,
    onChange,
    placeholderText = 'Select date',
    className = '',
    isClearable = true,
    minDate,
    maxDate,
    dateFormat = 'MMM d, yyyy',
    disabled = false,
    dateOnly = false
}) => {
    const handleChange = (date: Date | null) => {
        if (dateOnly && date) {
            // Create a new date in local timezone to avoid timezone conversion issues
            const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            onChange(localDate);
        } else {
            onChange(date);
        }
    };

    return (
        <DatePicker
            selected={selected}
            onChange={handleChange}
            className={`${styles.datePicker} ${className}`}
            placeholderText={placeholderText}
            dateFormat={dateFormat}
            isClearable={isClearable}
            minDate={minDate || undefined}
            maxDate={maxDate || undefined}
            popperPlacement="bottom-start"
            disabled={disabled}
        />
    );
};

export default CommonDatePicker;