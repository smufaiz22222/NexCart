import { MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import B2BCartAddressForm from './B2BCartAddressForm';

const EMPTY_ARRAY = [];

export default function B2BCartAddressSection({
  addresses = EMPTY_ARRAY,
  selectedAddressId,
  setSelectedAddressId,
  loading,
  showForm,
  setShowForm,
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
  resolvedLocalityOptions = EMPTY_ARRAY,
}) {
  return (
    <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Shipping Address
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setForm(defaultForm);
            }}
            className="text-xs font-bold text-[#0047AB] hover:underline"
          >
            + Add New Address
          </button>
        )}
      </div>

      {showForm ? (
        <B2BCartAddressForm
          form={form}
          setForm={setForm}
          defaultForm={defaultForm}
          error={error}
          setError={setError}
          saving={saving}
          handleSubmit={handleSubmit}
          canSubmit={canSubmit}
          postalLookup={postalLookup}
          manualLocalityActive={manualLocalityActive}
          setManualLocalityActive={setManualLocalityActive}
          selectedLocality={selectedLocality}
          setSelectedLocality={setSelectedLocality}
          manualLocality={manualLocality}
          setManualLocality={setManualLocality}
          resolvedLocalityOptions={resolvedLocalityOptions}
          setShowForm={setShowForm}
        />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-[#6C757D] animate-pulse">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <p className="text-xs text-[#6C757D]">
              No saved addresses yet.{' '}
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setForm(defaultForm);
                }}
                className="text-[#0047AB] font-bold underline"
              >
                Add one above
              </button>
            </p>
          ) : (
            addresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => setSelectedAddressId(addr.id)}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition text-xs',
                  selectedAddressId === addr.id
                    ? 'border-[#0047AB] bg-blue-50/50'
                    : 'border-[#EFEFEF] hover:border-[#C0C0C0]'
                )}
              >
                <p className="font-bold">{addr.fullName}</p>
                <p className="text-[#6C757D] mt-0.5">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}, {addr.state} -{' '}
                  {addr.postalCode}
                </p>
                {selectedAddressId === addr.id && (
                  <CheckCircle2 className="w-4 h-4 text-[#0047AB] mt-1" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
