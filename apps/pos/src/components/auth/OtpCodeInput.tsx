"use client";

import {
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

const LENGTH = 6;

const cellClass =
  "h-14 w-12 sm:h-16 sm:w-14 rounded-xl border border-slate-200 bg-white text-center text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-slate-300 focus-visible:border-[#0085db] focus-visible:ring-2 focus-visible:ring-[#0085db]/25 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, LENGTH);
}

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  id,
  "aria-label": ariaLabel = "Código de 6 dígitos",
  className,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function focusAt(index: number) {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    el?.focus();
    el?.select();
  }

  function commit(next: string) {
    onChange(onlyDigits(next));
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = onlyDigits(e.target.value);
    if (raw.length > 1) {
      const merged = onlyDigits(value.slice(0, index) + raw);
      commit(merged);
      focusAt(Math.min(merged.length, LENGTH - 1));
      return;
    }

    const next = digits.map((d, i) => (i === index ? (raw.at(-1) ?? "") : d));
    const joined = onlyDigits(next.join(""));
    commit(joined);
    if (raw) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = digits.map((d, i) => (i === index ? "" : d));
        commit(next.join(""));
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const next = digits.map((d, i) => (i === index - 1 ? "" : d));
        commit(next.join(""));
        focusAt(index - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = onlyDigits(e.clipboardData.getData("text"));
    if (!pasted) return;
    commit(pasted);
    focusAt(Math.min(pasted.length, LENGTH - 1));
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className={`flex items-center justify-center gap-3 sm:gap-3.5 ${className ?? ""}`}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          maxLength={LENGTH}
          disabled={disabled}
          aria-label={`Dígito ${index + 1} de ${LENGTH}`}
          className={cellClass}
          value={digit}
          placeholder="·"
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
        />
      ))}
    </div>
  );
}
