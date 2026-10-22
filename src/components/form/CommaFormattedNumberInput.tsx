import { useLayoutEffect, useRef } from 'react';

interface CommaFormattedNumberInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

interface PendingSelection {
  startDigit: number;
  endDigit: number;
}

function formatDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function positionAfterDigits(value: string, digitCount: number): number {
  if (digitCount === 0) return 0;

  let digitsSeen = 0;
  for (let index = 0; index < value.length; index++) {
    if (/\d/.test(value[index])) {
      digitsSeen++;
      if (digitsSeen === digitCount) return index + 1;
    }
  }

  return value.length;
}

export function CommaFormattedNumberInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  disabled,
  'data-testid': testId,
}: CommaFormattedNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<PendingSelection | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelection.current;
    if (!input || !selection) return;

    input.setSelectionRange(
      positionAfterDigits(value, selection.startDigit),
      positionAfterDigits(value, selection.endDigit),
    );
    pendingSelection.current = null;
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9,]*"
      autoComplete="off"
      className={className}
      id={id}
      value={formatDigits(value)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={testId}
      onChange={(event) => {
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const nextValue = formatDigits(input.value);
        pendingSelection.current = {
          startDigit: input.value.slice(0, start).replace(/\D/g, '').length,
          endDigit: input.value.slice(0, end).replace(/\D/g, '').length,
        };
        onChange(nextValue);
      }}
    />
  );
}
