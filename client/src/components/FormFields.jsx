import { cn } from '../utils/cn';

/**
 * A headless-ready text input component that integrates with TanStack Form's useField hook.
 */
export function TextField({ field, label, placeholder, type = 'text', className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={field.name}
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500"
        >
          {label}
        </label>
      )}
      <input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border border-zinc-700 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50',
          field.state.meta.isTouched && field.state.meta.errors.length > 0 && 'border-red-500/50'
        )}
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <p className="text-[11px] font-medium text-red-400 pl-1">
          {field.state.meta.errors.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A headless-ready textarea component.
 */
export function TextAreaField({ field, label, placeholder, rows = 4, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={field.name}
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500"
        >
          {label}
        </label>
      )}
      <textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-zinc-700 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/50 resize-none',
          field.state.meta.isTouched && field.state.meta.errors.length > 0 && 'border-red-500/50'
        )}
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <p className="text-[11px] font-medium text-red-400 pl-1">
          {field.state.meta.errors.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A subscription-based error display for form-level errors.
 */
export function FormError(props) {
  const { form } = props;
  const Subscribe = form.Subscribe;
  return (
    <Subscribe
      selector={(state) => [state.errorMap]}
      children={([errorMap]) => {
        const errors = Object.values(errorMap).filter(Boolean);
        if (errors.length === 0) return null;
        return (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">
            {errors.join(', ')}
          </div>
        );
      }}
    />
  );
}
