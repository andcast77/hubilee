import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible arriba del input */
  label?: string;
  /** Mensaje de error a mostrar debajo del input */
  error?: string | undefined;
  /** Texto de ayuda a mostrar debajo del input */
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText,
    className = '',
    value,
    onChange,
    type = 'text',
    maxLength = 500,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
    const errorClasses = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300';
    const classes = `${baseClasses} ${errorClasses} ${className}`;

    // Valor seguro: siempre string, nunca undefined/null
    const safeValue = typeof value === 'string' ? value : '';

    // Manejar cambios
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input 
          ref={ref}
          className={classes} 
          value={safeValue}
          onChange={handleChange}
          type={type}
          maxLength={maxLength}
          {...props} 
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 
