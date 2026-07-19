import { cn } from '../utils/cn';

/**
 * A headless-ready textarea component.
 */
export function TextAreaField({ field, label, placeholder, rows = 4, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={field.name}
          className="text-[10px] font-bold uppercase tracking-wider text-text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={field.name}
        name={field.name}
        aria-label={label || placeholder || field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-md border border-border-subtle bg-bg-main px-4 py-2.5 text-sm text-text-title outline-none transition-all placeholder:text-text-muted/60 focus:border-brand-primary/50 resize-none',
          field.state.meta.isTouched &&
            field.state.meta.errors.length > 0 &&
            'border-semantic-danger/50'
        )}
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <p className="text-[11px] font-medium text-semantic-danger pl-1">
          {field.state.meta.errors.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
