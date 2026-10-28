import React, { useEffect, useState } from 'react';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  integer?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

/**
 * Number field that shows 0 by default but lets the user clear "0"
 * and type a new value (empty while editing; commits to min/0 on blur).
 */
export const ClearableNumberInput: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  max,
  step,
  integer = false,
  disabled,
  className,
  id,
  name,
  placeholder = '0',
  required,
}) => {
  const [text, setText] = useState(() => String(value ?? min));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value ?? min));
  }, [value, min, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    let n = trimmed === '' || trimmed === '-' || trimmed === '.' ? min : Number(trimmed);
    if (!Number.isFinite(n)) n = min;
    if (integer) n = Math.floor(n);
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    setText(String(n));
    onChange(n);
    return n;
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={step}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      value={text}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) {
          setText(v);
          if (v !== '' && v !== '-' && v !== '.' && Number.isFinite(Number(v))) {
            let n = Number(v);
            if (integer) n = Math.floor(n);
            if (min != null && n < min) return;
            if (max != null && n > max) {
              n = max;
              setText(String(n));
            }
            onChange(n);
          }
        }
      }}
    />
  );
};
