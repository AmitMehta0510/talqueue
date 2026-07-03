import React from "react";
import { Search, X } from "lucide-react";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Callback fired when the search value changes. */
  onValueChange?: (value: string) => void;
  /** Optional callback fired when the search value is cleared. */
  onClear?: () => void;
  /** Custom class overrides for the outer wrapper. */
  wrapperClassName?: string;
}

/**
 * A highly reusable, fully styled SearchInput component that renders an
 * input field with a search icon and a clear button.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, onClear, wrapperClassName = "", className = "", ...props }, ref) => {
    const hasValue = Boolean(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
      // Trigger a change event or state update if custom handlers exist
      if (onValueChange) {
        onValueChange("");
      }
    };

    return (
      <div className={`relative flex items-center w-full ${wrapperClassName}`}>
        <span className="absolute left-3 text-muted-fg pointer-events-none flex items-center justify-center">
          <Search className="h-4 w-4" />
        </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          className={`field pl-10 pr-9 ${className}`}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-fg hover:text-primary transition-colors flex items-center justify-center"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
