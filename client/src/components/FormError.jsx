/**
 * A subscription-based error display for form-level errors.
 */
export function FormError(props) {
  const { form } = props;
  const Subscribe = form.Subscribe;
  return (
    <Subscribe selector={(state) => [state.errorMap]}>
      {([errorMap]) => {
        const errors = Object.values(errorMap).filter(Boolean);
        if (errors.length === 0) return null;
        return (
          <div className="rounded-md border border-semantic-danger/20 bg-semantic-danger/10 px-4 py-3 text-xs font-semibold text-semantic-danger">
            {errors.join(', ')}
          </div>
        );
      }}
    </Subscribe>
  );
}
