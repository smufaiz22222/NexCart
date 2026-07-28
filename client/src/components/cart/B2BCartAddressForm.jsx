import { cn } from '../../utils/cn';

export default function B2BCartAddressForm({
  form,
  setForm,
  defaultForm,
  error,
  setError,
  saving,
  handleSubmit,
  canSubmit,
  postalLookup,
  manualLocalityActive,
  setManualLocalityActive,
  selectedLocality,
  setSelectedLocality,
  manualLocality,
  setManualLocality,
  resolvedLocalityOptions,
  setShowForm,
}) {
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border border-[#EFEFEF] rounded-lg p-4 bg-[#FBFBFB]"
    >
      <p className="font-bold text-xs text-[#161412] pb-1 border-b border-[#EFEFEF]">
        Add New Address
      </p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="b2b-cart-full-name"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Full Name *
          </label>
          <input
            id="b2b-cart-full-name"
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
          />
        </div>

        <div>
          <label
            htmlFor="b2b-cart-phone"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Mobile Number *
          </label>
          <input
            id="b2b-cart-phone"
            type="text"
            required
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value.replace(/\D/g, '').slice(0, 10),
              })
            }
            placeholder="10-digit number"
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="b2b-cart-address-line-1"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Address Line 1 *
          </label>
          <input
            id="b2b-cart-address-line-1"
            type="text"
            required
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            placeholder="Flat, House no., Building, Street"
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
          />
        </div>

        <div>
          <label
            htmlFor="b2b-cart-postal-code"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Postal Code *
          </label>
          <input
            id="b2b-cart-postal-code"
            type="text"
            required
            value={form.postalCode}
            onChange={(e) =>
              setForm({
                ...form,
                postalCode: e.target.value.replace(/\D/g, '').slice(0, 6),
              })
            }
            placeholder="6-digit pincode"
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
          />
          <p
            className={cn(
              'text-[10px] mt-1',
              postalLookup.status === 'error' || postalLookup.status === 'invalid'
                ? 'text-red-500'
                : postalLookup.status === 'resolved'
                  ? 'text-emerald-600'
                  : 'text-[#6C757D]'
            )}
          >
            {postalLookup.status === 'loading' ? 'Checking pincode...' : postalLookup.message}
          </p>
        </div>

        <div>
          <label
            htmlFor="b2b-cart-locality"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Area / Locality *
          </label>
          {postalLookup.resolved ? (
            <>
              <select
                id="b2b-cart-locality"
                value={manualLocalityActive ? postalLookup.otherValue : selectedLocality}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === postalLookup.otherValue) {
                    setManualLocalityActive(true);
                    setSelectedLocality(val);
                    setForm({ ...form, addressLine2: '' });
                    return;
                  }
                  setManualLocalityActive(false);
                  setSelectedLocality(val);
                  setManualLocality('');
                  setForm({ ...form, addressLine2: val });
                }}
                className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                required
              >
                <option value="" disabled>
                  Select locality
                </option>
                {resolvedLocalityOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === postalLookup.otherValue ? 'Other' : loc}
                  </option>
                ))}
              </select>
              {manualLocalityActive && (
                <input
                  id="b2b-cart-manual-locality"
                  type="text"
                  required
                  aria-label="Enter locality manually"
                  value={manualLocality}
                  onChange={(e) => setManualLocality(e.target.value)}
                  placeholder="Enter locality manually"
                  className="mt-2 w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                />
              )}
            </>
          ) : (
            <input
              id="b2b-cart-locality"
              type="text"
              disabled
              placeholder="Enter a valid pincode first"
              className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-400"
            />
          )}
        </div>

        <div>
          <label
            htmlFor="b2b-cart-city"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            City (Auto-filled)
          </label>
          <input
            id="b2b-cart-city"
            type="text"
            readOnly
            value={form.city}
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-600 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="b2b-cart-state"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            State (Auto-filled)
          </label>
          <input
            id="b2b-cart-state"
            type="text"
            readOnly
            value={form.state}
            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-600 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setForm(defaultForm);
            setError('');
          }}
          className="px-3 py-1.5 border border-[#EFEFEF] hover:bg-zinc-50 rounded-lg text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors',
            saving || !canSubmit
              ? 'bg-[#C0C0C0] cursor-not-allowed'
              : 'bg-[#0047AB] hover:bg-[#003B91]'
          )}
        >
          {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}
