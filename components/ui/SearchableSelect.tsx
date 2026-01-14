import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps {
    label?: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = "Select...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update search term when value changes externally
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(value);
        }
    }, [value, isOpen]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option: string) => {
        onChange(option);
        setSearchTerm(option);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        inputRef.current?.focus();
    };

    return (
        <div className={`flex flex-col gap-1.5 ${className}`} ref={wrapperRef}>
            {label && <label className="text-xs text-scifi-accent font-mono uppercase tracking-wider">{label}</label>}
            <div className="relative group">
                <div
                    className="relative flex items-center"
                    onClick={() => {
                        if (!isOpen) setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                >
                    <Search className="absolute left-3 w-4 h-4 text-gray-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) setIsOpen(true);
                            // If user clears input, clear value
                            if (e.target.value === '') onChange('');
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full bg-scifi-card border border-scifi-border rounded-md py-2 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-scifi-primary focus:ring-1 focus:ring-scifi-primary transition-colors placeholder-gray-600"
                    />
                    {value ? (
                        <X
                            onClick={handleClear}
                            className="absolute right-2 w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors"
                        />
                    ) : (
                        <ChevronDown className={`absolute right-2 w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#0f172a] border border-scifi-border rounded-md shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${opt === value
                                            ? 'bg-scifi-primary/20 text-scifi-primary'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {opt}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                                No matches found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
