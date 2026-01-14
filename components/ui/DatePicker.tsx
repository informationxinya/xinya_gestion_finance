import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, min, max, className = "" }) => {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = useState(value);

    // Sync display value when prop value changes
    useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    const handleContainerClick = () => {
        // Trigger the native date picker
        if (dateInputRef.current) {
            try {
                dateInputRef.current.showPicker();
            } catch (error) {
                dateInputRef.current.focus();
            }
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);
    };

    const handleBlur = () => {
        const parsed = parseDateInput(displayValue);
        if (parsed) {
            onChange(parsed);
            setDisplayValue(parsed);
        } else {
            // Revert to valid value if invalid
            setDisplayValue(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            textInputRef.current?.blur();
        }
    };

    const parseDateInput = (input: string): string | null => {
        if (!input) return null;

        // 1. Check for 8-digit format: 20250701
        const compactRegex = /^(\d{4})(\d{2})(\d{2})$/;
        const compactMatch = input.match(compactRegex);
        if (compactMatch) {
            const [_, y, m, d] = compactMatch;
            return `${y}-${m}-${d}`;
        }

        // 2. Check for standard format: 2025-07-01 or 2025/07/01
        const standardRegex = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
        const standardMatch = input.match(standardRegex);
        if (standardMatch) {
            const [_, y, m, d] = standardMatch;
            return `${y}-${m}-${d}`;
        }

        return null;
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setDisplayValue(e.target.value);
    };

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-xs text-scifi-accent font-mono uppercase">{label}</label>
            <div className="relative group">
                <div
                    className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer z-10"
                    onClick={handleContainerClick}
                >
                    <Calendar className="h-4 w-4 text-gray-400 group-hover:text-scifi-primary transition-colors" />
                </div>

                {/* Visible Text Input for Smart Typing */}
                <input
                    ref={textInputRef}
                    type="text"
                    value={displayValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="YYYY-MM-DD"
                    className="bg-scifi-card border border-scifi-border rounded p-2 pl-10 w-full text-sm text-white focus:border-scifi-primary outline-none transition-colors hover:border-scifi-primary/50 font-mono"
                />

                {/* Hidden Date Input for Picker */}
                <input
                    ref={dateInputRef}
                    type="date"
                    value={value}
                    onChange={handleDateSelect}
                    min={min}
                    max={max}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer -z-10"
                    tabIndex={-1}
                />
            </div>
        </div>
    );
};
