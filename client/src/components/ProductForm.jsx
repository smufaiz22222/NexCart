import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { TextField, TextAreaField, FormError } from './FormFields';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import apiClient from '../api/axios';
import categoryData from '../data/categoryData';

const generateAttributeId = () => `attr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function SelectField({ field, label, options, placeholder, className, disabled, onChange }) {
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
      <div className="relative">
        <select
          id={field.name}
          name={field.name}
          aria-label={label || placeholder || field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value;
            field.handleChange(val);
            if (onChange) onChange(val);
          }}
          className={cn(
            'w-full rounded-md border border-border-subtle bg-bg-main px-4 py-2.5 text-sm text-text-title outline-none transition-all focus:border-brand-primary/50 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            field.state.meta.isTouched &&
              field.state.meta.errors.length > 0 &&
              'border-semantic-danger/50'
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: `right 1rem center`,
            backgroundRepeat: `no-repeat`,
            backgroundSize: `1.2em 1.2em`,
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-bg-card text-text-title">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <p className="text-[11px] font-medium text-semantic-danger pl-1">
          {field.state.meta.errors.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A robust Product Form built with TanStack Form.
 * Demonstrates nested arrays, sync/async validation, and granular subscriptions.
 */
function BasicInfoSection({ form, initialSku }) {
  return (
    <>
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
                if (response.data.exists && value !== initialSku) {
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
                <Loader2 className="absolute right-3 top-8 h-4 w-4 animate-spin text-brand-accent" />
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
    </>
  );
}

function PricingSection({ form }) {
  return (
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
        name="actualPrice"
        validators={{
          onChange: ({ value }) => {
            if (value !== undefined && value !== '' && (isNaN(value) || parseFloat(value) < 0)) {
              return 'Enter a valid actual price';
            }
            const priceVal = form.getFieldValue('price');
            if (value && priceVal && parseFloat(value) < parseFloat(priceVal)) {
              return 'Actual price must be >= selling price';
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Actual Price (Original) (₹)"
            type="number"
            placeholder="0.00"
          />
        )}
      </form.Field>

      <form.Field
        name="price"
        validators={{
          onChange: ({ value }) => {
            if (isNaN(value) || value <= 0) {
              return 'Enter a valid price';
            }
            const actualPriceVal = form.getFieldValue('actualPrice');
            if (actualPriceVal && parseFloat(value) > parseFloat(actualPriceVal)) {
              return 'Selling price cannot exceed Actual Price';
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Discounted/Selling Price (₹) *"
            type="number"
            placeholder="0.00"
          />
        )}
      </form.Field>
    </div>
  );
}

function InventorySection({ form, defaultDeliveryFee }) {
  return (
    <>
      {/* Category & Subcategory Settings */}
      <div className="grid gap-6 sm:grid-cols-2">
        <form.Field
          name="category"
          validators={{
            onChange: ({ value }) => (!value ? 'Category is required' : undefined),
          }}
        >
          {(field) => {
            const categoryOptions = categoryData.map((c) => ({
              value: c.dbCategory,
              label: c.name,
            }));
            return (
              <SelectField
                field={field}
                label="Category *"
                placeholder="Select Category"
                options={categoryOptions}
                onChange={() => {
                  form.setFieldValue('subcategory', '');
                }}
              />
            );
          }}
        </form.Field>

        <form.Subscribe selector={(state) => [state.values.category]}>
          {([categoryValue]) => {
            const selectedCat = categoryData.find((c) => c.dbCategory === categoryValue);
            const subcategories = selectedCat ? selectedCat.subcategories : [];
            const subcategoryOptions = subcategories.map((sub) => ({ value: sub, label: sub }));

            return (
              <form.Field name="subcategory">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Subcategory"
                    placeholder={categoryValue ? 'Select Subcategory' : 'Select Category first'}
                    options={subcategoryOptions}
                    disabled={!categoryValue}
                  />
                )}
              </form.Field>
            );
          }}
        </form.Subscribe>
      </div>

      {/* Delivery Settings */}
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
              <p className="text-[11px] text-text-muted font-medium leading-normal pl-1">
                Specify a custom per-item delivery fee for this product. Leave blank to default to
                your profile shipping settings.
              </p>
            </div>
          )}
        </form.Field>
      </div>

      {/* Stock Management */}
      <div className="grid gap-6 sm:grid-cols-2">
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
    </>
  );
}

function FormActions({ form, onCancel, initialData }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-4 border-t border-border-subtle/50 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-border-subtle bg-bg-card px-6 py-2.5 text-sm font-semibold text-text-body transition hover:bg-bg-card-hover"
      >
        Cancel
      </button>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md bg-brand-primary px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
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
  );
}

export function ProductForm({ initialData, onSubmit, onCancel }) {
  const [profileDeliveryFee, setProfileDeliveryFee] = useState(null);
  const defaultDeliveryFee =
    initialData?.wholesaler?.deliveryFee !== undefined &&
    initialData?.wholesaler?.deliveryFee !== null
      ? Number(initialData.wholesaler.deliveryFee)
      : (profileDeliveryFee ?? 0);

  useEffect(() => {
    if (
      initialData?.wholesaler?.deliveryFee !== undefined &&
      initialData?.wholesaler?.deliveryFee !== null
    ) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/b2b/wholesaler/profile');
        if (response.data?.wholesaler?.deliveryFee !== undefined) {
          setProfileDeliveryFee(Number(response.data.wholesaler.deliveryFee));
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
      actualPrice: initialData?.actualPrice || '',
      sku: initialData?.sku || '',
      category: initialData?.category || '',
      subcategory: initialData?.subcategory || '',
      currentStock: initialData?.currentStock !== undefined ? initialData.currentStock : '',
      minStock: initialData?.minStock !== undefined ? initialData.minStock : '',
      deliveryFee:
        initialData?.deliveryFee !== undefined && initialData.deliveryFee !== null
          ? initialData.deliveryFee
          : '',
      attributes: (initialData?.attributes || [{ name: '', value: '' }]).map((attr, idx) => ({
        ...attr,
        id: attr.id || `initial-attr-${idx}`,
      })),
    },
    onSubmit: async ({ value }) => {
      const sanitizedValue = {
        ...value,
        attributes: value.attributes?.map(({ id: _id, ...rest }) => rest) || [],
      };
      await onSubmit(sanitizedValue);
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

        <BasicInfoSection form={form} initialSku={initialData?.sku} />

        <PricingSection form={form} />

        <InventorySection form={form} defaultDeliveryFee={defaultDeliveryFee} />

        {/* Nested Attributes Section (Field Array) */}
        <ProductAttributesSection form={form} />

        <FormActions form={form} onCancel={onCancel} initialData={initialData} />
      </form>
    </div>
  );
}

function ProductAttributesSection({ form }) {
  return (
    <div className="space-y-4 rounded-lg border border-border-subtle bg-bg-main p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-title tracking-wide">Product Attributes</h3>
          <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider">
            Add details like Material, Fit, or Origin
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            form.pushFieldValue('attributes', {
              id: generateAttributeId(),
              name: '',
              value: '',
            })
          }
          className="flex items-center gap-1.5 rounded-md bg-bg-card border border-border-subtle px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-body transition-all hover:bg-bg-card-hover hover:text-text-title"
        >
          <Plus className="h-3 w-3" />
          Add Detail
        </button>
      </div>

      <form.Field name="attributes" mode="array">
        {(field) => (
          <div className="space-y-3">
            {field.state.value.map((item, i) => (
              <div
                key={item.id}
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
                  className="mb-1 rounded-md bg-semantic-danger/10 p-3 text-semantic-danger opacity-0 transition-all hover:bg-semantic-danger/20 group-hover:opacity-100"
                  aria-label="Remove detail"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {field.state.value.length === 0 && (
              <p className="text-center py-4 text-xs text-text-muted italic">
                No custom details added yet.
              </p>
            )}
          </div>
        )}
      </form.Field>
    </div>
  );
}
