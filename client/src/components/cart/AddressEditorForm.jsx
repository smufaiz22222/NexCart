import React, { useMemo } from 'react';
import { Home } from 'lucide-react';
import { cn } from '../../utils/cn';

function InputField({ label, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">{label}</span>
      <div className="mt-2">{children}</div>
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

  return (
    <form onSubmit={handleAddressSubmit} className="mt-8 rounded-[30px] bg-[#f8f6f1] p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-[#161412] p-3 text-white">
          <Home className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight text-[#161412]">
            {editingAddressId ? 'Edit address' : 'Add address'}
          </p>
          <p className="text-xs text-[#6b665f]">
            City and state are filled from the pincode lookup.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <InputField label="Full Name">
          <input
            value={addressForm.fullName}
            onChange={(event) =>
              setAddressForm((current) => ({ ...current, fullName: event.target.value }))
            }
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
            required
          />
        </InputField>

        <InputField label="Mobile Number">
          <input
            value={addressForm.phone}
            onChange={(event) =>
              setAddressForm((current) => ({
                ...current,
                phone: event.target.value.replace(/\D/g, '').slice(0, 10),
              }))
            }
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
            inputMode="numeric"
            required
          />
        </InputField>

        <InputField label="Address Line 1" className="sm:col-span-2">
          <input
            value={addressForm.addressLine1}
            onChange={(event) =>
              setAddressForm((current) => ({
                ...current,
                addressLine1: event.target.value,
              }))
            }
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
            required
          />
        </InputField>

        <InputField label="Postal Code">
          <input
            value={addressForm.postalCode}
            onChange={(event) =>
              setAddressForm((current) => ({
                ...current,
                postalCode: event.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
            inputMode="numeric"
            required
          />
          <p
            className={cn(
              'mt-2 text-xs',
              postalLookup.status === 'error' || postalLookup.status === 'invalid'
                ? 'text-[#b34d3f]'
                : postalLookup.status === 'resolved'
                  ? 'text-[#2f5d46]'
                  : 'text-[#6b665f]'
            )}
          >
            {postalLookup.status === 'loading'
              ? 'Fetching postal details...'
              : postalLookup.message}
          </p>
        </InputField>

        <InputField label="Area / Locality">
          {postalLookup.resolved ? (
            <>
              <select
                value={isManualLocality ? postalLookup.otherValue : selectedLocality}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (nextValue === postalLookup.otherValue) {
                    setIsManualLocality(true);
                    setSelectedLocality(nextValue);
                    setAddressForm((current) => ({ ...current, addressLine2: '' }));
                    return;
                  }

                  setIsManualLocality(false);
                  setSelectedLocality(nextValue);
                  setManualLocality('');
                  setAddressForm((current) => ({ ...current, addressLine2: nextValue }));
                }}
                className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                required
              >
                <option value="" disabled>
                  Select locality
                </option>
                {resolvedLocalityOptions.map((locality) => (
                  <option key={locality} value={locality}>
                    {locality === postalLookup.otherValue ? 'Other' : locality}
                  </option>
                ))}
              </select>
              {isManualLocality && (
                <input
                  value={manualLocality}
                  onChange={(event) => setManualLocality(event.target.value)}
                  className="mt-3 w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                  placeholder="Type your locality manually"
                  required
                />
              )}
            </>
          ) : (
            <input
              value={addressForm.addressLine2}
              onChange={(event) =>
                setAddressForm((current) => ({
                  ...current,
                  addressLine2: event.target.value,
                }))
              }
              className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
              placeholder="Enter a valid pincode first"
              disabled
            />
          )}
        </InputField>

        <InputField label="City">
          <input
            value={addressForm.city}
            readOnly
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-[#f3efe8] px-4 py-4 text-sm outline-none"
          />
        </InputField>

        <InputField label="State">
          <input
            value={addressForm.state}
            readOnly
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-[#f3efe8] px-4 py-4 text-sm outline-none"
          />
        </InputField>

        <InputField label="Landmark" className="sm:col-span-2">
          <input
            value={addressForm.landmark}
            onChange={(event) =>
              setAddressForm((current) => ({ ...current, landmark: event.target.value }))
            }
            className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
            placeholder="Optional landmark"
          />
        </InputField>
      </div>

      {addressError && <p className="mt-4 text-sm text-[#b34d3f]">{addressError}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSavingAddress}
          className="rounded-full bg-[#161412] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingAddress
            ? 'Saving address...'
            : editingAddressId
              ? 'Update address'
              : 'Save address'}
        </button>

        {(editingAddressId || addressForm.fullName || addressForm.postalCode) && (
          <button
            type="button"
            onClick={resetAddressEditor}
            className="rounded-full border border-[#ddd7cc] bg-white px-5 py-3 text-sm font-bold text-[#161412]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
