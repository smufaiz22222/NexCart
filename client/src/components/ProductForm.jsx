import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { TextField, TextAreaField, FormError } from './FormFields';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import apiClient from '../api/axios';

/**
 * A robust Product Form built with TanStack Form.
 * Demonstrates nested arrays, sync/async validation, and granular subscriptions.
 */
export function ProductForm({ initialData, onSubmit, onCancel }) {
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(0);

  useEffect(() => {
    if (
      initialData?.wholesaler?.deliveryFee !== undefined &&
      initialData?.wholesaler?.deliveryFee !== null
    ) {
      setDefaultDeliveryFee(Number(initialData.wholesaler.deliveryFee));
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/b2b/wholesaler/profile');
        if (response.data?.wholesaler?.deliveryFee !== undefined) {
          setDefaultDeliveryFee(Number(response.data.wholesaler.deliveryFee));
        }
      } catch (err) {
        console.debug('Failed to fetch wholesaler profile for delivery fee placeholder:', err);
      }
    };
    fetchProfile();
  }, [initialData]);

  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || '',
      costPrice: initialData?.costPrice || '',
      sku: initialData?.sku || '',
      category: initialData?.category || '',
      currentStock: initialData?.currentStock !== undefined ? initialData.currentStock : '',
      minStock: initialData?.minStock !== undefined ? initialData.minStock : '',
      deliveryFee:
        initialData?.deliveryFee !== undefined && initialData.deliveryFee !== null
          ? initialData.deliveryFee
          : '',
      attributes: initialData?.attributes || [{ name: '', value: '' }],
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FormError form={form} />

        {/* Basic Information Section */}
        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => (!value ? 'Name is required' : undefined),
            }}
          >
            {(field) => (
              <TextField
                field={field}
                label="Product Name *"
                placeholder="e.g. Vintage Denim Jacket"
              />
            )}
          </form.Field>

          <form.Field
            name="sku"
            validators={{
              onChange: ({ value }) => (!value ? 'SKU is required' : undefined),
              onChangeAsyncDebounceMs: 500,
              onChangeAsync: async ({ value }) => {
                if (!value) return;
                try {
                  const response = await apiClient.get(`/products/check-sku/${value}`);
                  if (response.data.exists && value !== initialData?.sku) {
                    return 'This SKU is already in use';
                  }
                } catch {
                  console.debug('SKU check failed or endpoint missing');
                }
              },
            }}
          >
            {(field) => (
              <div className="relative">
                <TextField field={field} label="SKU Code *" placeholder="e.g. JKT-DENIM-001" />
                {field.state.meta.isValidating ? (
                  <Loader2 className="absolute right-3 top-8 h-4 w-4 animate-spin text-amber-500" />
                ) : null}
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="description">
          {(field) => (
            <TextAreaField
              field={field}
              label="Description"
              placeholder="Tell buyers what makes this product special..."
            />
          )}
        </form.Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field
            name="price"
            validators={{
              onChange: ({ value }) =>
                isNaN(value) || value <= 0 ? 'Enter a valid price' : undefined,
            }}
          >
            {(field) => (
              <TextField field={field} label="Price (₹) *" type="number" placeholder="0.00" />
            )}
          </form.Field>

          <form.Field name="category">
            {(field) => <TextField field={field} label="Category" placeholder="e.g. Outerwear" />}
          </form.Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field
            name="deliveryFee"
            validators={{
              onChange: ({ value }) =>
                value !== undefined && value !== '' && (isNaN(value) || parseFloat(value) < 0)
                  ? 'Enter a valid delivery fee'
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <TextField
                  field={field}
                  label="Delivery Fee Override (₹)"
                  type="number"
                  placeholder={`Default: ₹${defaultDeliveryFee.toFixed(2)}`}
                />
                <p className="text-[11px] text-zinc-500 font-medium leading-normal pl-1">
                  Specify a custom per-item delivery fee for this product. Leave blank to default to
                  your profile shipping settings.
                </p>
              </div>
            )}
          </form.Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <form.Field
            name="costPrice"
            validators={{
              onChange: ({ value }) =>
                value !== undefined && value !== '' && (isNaN(value) || parseFloat(value) < 0)
                  ? 'Enter a valid cost price'
                  : undefined,
            }}
          >
            {(field) => (
              <TextField field={field} label="Cost Price (₹)" type="number" placeholder="0.00" />
            )}
          </form.Field>

          <form.Field
            name="currentStock"
            validators={{
              onChange: ({ value }) =>
                value !== undefined && value !== '' && (isNaN(value) || parseInt(value, 10) < 0)
                  ? 'Enter a valid stock number'
                  : undefined,
            }}
          >
            {(field) => (
              <TextField field={field} label="Current Stock" type="number" placeholder="0" />
            )}
          </form.Field>

          <form.Field
            name="minStock"
            validators={{
              onChange: ({ value }) =>
                value !== undefined && value !== '' && (isNaN(value) || parseInt(value, 10) < 0)
                  ? 'Enter a valid min stock alert'
                  : undefined,
            }}
          >
            {(field) => (
              <TextField field={field} label="Min Stock Alert" type="number" placeholder="10" />
            )}
          </form.Field>
        </div>

        {/* Nested Attributes Section (Field Array) */}
        <div className="space-y-4 rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Product Attributes</h3>
              <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">
                Add details like Material, Fit, or Origin
              </p>
            </div>
            <button
              type="button"
              onClick={() => form.pushFieldValue('attributes', { name: '', value: '' })}
              className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300 transition-all hover:bg-zinc-700 hover:text-white"
            >
              <Plus className="h-3 w-3" />
              Add Detail
            </button>
          </div>

          <form.Field name="attributes" mode="array">
            {(field) => (
              <div className="space-y-3">
                {field.state.value.map((_, i) => (
                  <div
                    key={i}
                    className="flex items-end gap-3 group animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <form.Field name={`attributes[${i}].name`}>
                      {(subField) => (
                        <TextField
                          field={subField}
                          placeholder="Label (e.g. Material)"
                          className="flex-1"
                        />
                      )}
                    </form.Field>
                    <form.Field name={`attributes[${i}].value`}>
                      {(subField) => (
                        <TextField
                          field={subField}
                          placeholder="Value (e.g. 100% Cotton)"
                          className="flex-1"
                        />
                      )}
                    </form.Field>
                    <button
                      type="button"
                      onClick={() => form.removeFieldValue('attributes', i)}
                      className="mb-1 rounded-xl bg-red-500/10 p-3 text-red-400 opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100"
                      aria-label="Remove detail"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {field.state.value.length === 0 && (
                  <p className="text-center py-4 text-xs text-zinc-600 italic">
                    No custom details added yet.
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse gap-3 pt-4 border-t border-zinc-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            Cancel
          </button>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-8 py-3 text-sm font-black text-zinc-950 transition shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:bg-amber-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  isSubmitting && 'animate-pulse'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {initialData ? 'Save Changes' : 'Create Product'}
                  </>
                )}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
