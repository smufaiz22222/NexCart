import React, { useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '../../utils/cn';

function InputField({ label, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function AddressEditorForm({
  editingAddressId,
  addressForm,
  setAddressForm,
  postalLookup,
  selectedLocality,
  setSelectedLocality,
  manualLocality,
  setManualLocality,
  isManualLocality,
  setIsManualLocality,
  isSavingAddress,
  addressError,
  resetAddressEditor,
  handleAddressSubmit,
}) {
  const resolvedLocalityOptions = useMemo(
    () => postalLookup.localities.filter(Boolean),
    [postalLookup.localities]
  );

  const inputClass =
    'w-full rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all placeholder:text-[#94a3b8]';
  const readonlyClass =
    'w-full rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] px-3.5 py-2.5 text-sm text-[#64748b] outline-none';

  return (
    <form
      onSubmit={handleAddressSubmit}
      className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center">
            <MapPin className="h-4 w-4 text-[#4f46e5]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">
              {editingAddressId ? 'Edit Address' : 'New Address'}
            </p>
            <p className="text-[10px] text-[#64748b]">City and state auto-fill from pincode</p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetAddressEditor}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#ef4444] hover:bg-red-50 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField label="Full Name">
          <input
            value={addressForm.fullName}
            onChange={(e) => setAddressForm((c) => ({ ...c, fullName: e.target.value }))}
            className={inputClass}
            placeholder="John Doe"
            required
          />
        </InputField>

        <InputField label="Mobile Number">
          <input
            value={addressForm.phone}
            onChange={(e) =>
              setAddressForm((c) => ({
                ...c,
                phone: e.target.value.replace(/\D/g, '').slice(0, 10),
              }))
            }
            className={inputClass}
            placeholder="9876543210"
            inputMode="numeric"
            required
          />
        </InputField>

        <InputField label="Address Line 1" className="sm:col-span-2">
          <input
            value={addressForm.addressLine1}
            onChange={(e) => setAddressForm((c) => ({ ...c, addressLine1: e.target.value }))}
            className={inputClass}
            placeholder="House no, building, street"
            required
          />
        </InputField>

        <InputField label="Postal Code">
          <input
            value={addressForm.postalCode}
            onChange={(e) =>
              setAddressForm((c) => ({
                ...c,
                postalCode: e.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            className={inputClass}
            placeholder="6-digit pincode"
            inputMode="numeric"
            required
          />
          {postalLookup.message && (
            <p
              className={cn(
                'mt-1 text-[10px]',
                postalLookup.status === 'error' || postalLookup.status === 'invalid'
                  ? 'text-red-500'
                  : postalLookup.status === 'resolved'
                    ? 'text-emerald-600'
                    : 'text-[#64748b]'
              )}
            >
              {postalLookup.status === 'loading' ? 'Looking up...' : postalLookup.message}
            </p>
          )}
        </InputField>

        <InputField label="Area / Locality">
          {postalLookup.resolved ? (
            <>
              <select
                value={isManualLocality ? postalLookup.otherValue : selectedLocality}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === postalLookup.otherValue) {
                    setIsManualLocality(true);
                    setSelectedLocality(val);
                    setAddressForm((c) => ({ ...c, addressLine2: '' }));
                    return;
                  }
                  setIsManualLocality(false);
                  setSelectedLocality(val);
                  setManualLocality('');
                  setAddressForm((c) => ({ ...c, addressLine2: val }));
                }}
                className={inputClass}
                required
              >
                <option value="" disabled>
                  Select locality
                </option>
                {resolvedLocalityOptions.map((locality) => (
                  <option key={locality} value={locality}>
                    {locality === postalLookup.otherValue ? 'Other (type manually)' : locality}
                  </option>
                ))}
              </select>
              {isManualLocality && (
                <input
                  value={manualLocality}
                  onChange={(e) => setManualLocality(e.target.value)}
                  className={cn(inputClass, 'mt-2')}
                  placeholder="Type your locality"
                  required
                />
              )}
            </>
          ) : (
            <input
              value={addressForm.addressLine2}
              onChange={(e) => setAddressForm((c) => ({ ...c, addressLine2: e.target.value }))}
              className={cn(inputClass, 'bg-[#f1f5f9]')}
              placeholder="Enter pincode first"
              disabled
            />
          )}
        </InputField>

        <InputField label="City">
          <input value={addressForm.city} readOnly className={readonlyClass} />
        </InputField>

        <InputField label="State">
          <input value={addressForm.state} readOnly className={readonlyClass} />
        </InputField>

        <InputField label="Landmark (optional)" className="sm:col-span-2">
          <input
            value={addressForm.landmark}
            onChange={(e) => setAddressForm((c) => ({ ...c, landmark: e.target.value }))}
            className={inputClass}
            placeholder="Near temple, opposite park, etc."
          />
        </InputField>
      </div>

      {addressError && <p className="mt-3 text-xs font-semibold text-red-500">{addressError}</p>}

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={isSavingAddress}
          className="rounded-xl bg-[#4f46e5] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#4338ca] disabled:opacity-50 transition-all btn-press"
        >
          {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={resetAddressEditor}
          className="rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-xs font-bold text-[#64748b] hover:text-[#1e293b] hover:border-[#1e293b] transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
