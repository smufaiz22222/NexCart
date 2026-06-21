import React from 'react';
import { CheckCircle2, LoaderCircle, MapPin, Pencil } from 'lucide-react';
import { cn } from '../../utils/cn';
import AddressEditorForm from './AddressEditorForm';

export default function AddressManager({
  addresses,
  selectedAddressId,
  setSelectedAddressId,
  isAddressLoading,
  handleSetDefaultAddress,
  startAddressEdit,
  handleDeleteAddress,
  // Props for form
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
  return (
    <div className="rounded-[34px] bg-white p-6 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#f8f6f1] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
            <MapPin className="h-4 w-4" />
            Shipping addresses
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[#161412]">
            Choose delivery details
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#6b665f]">
            Save multiple addresses, restore your selection on refresh, and use pincode-based city
            and state fill.
          </p>
        </div>

        <button
          type="button"
          onClick={() => startAddressEdit(null)}
          className="rounded-full border border-[#161412] px-5 py-3 text-sm font-bold text-[#161412]"
        >
          Add address
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {isAddressLoading ? (
          <div className="flex items-center gap-3 rounded-[24px] bg-[#f8f6f1] px-5 py-5 text-sm font-semibold text-[#6b665f]">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#161412]" />
            Loading saved addresses...
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#ddd7cc] px-5 py-6 text-sm text-[#6b665f]">
            No saved addresses yet. Add one below to continue checkout.
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={cn(
                'rounded-[26px] border p-5 transition',
                selectedAddressId === address.id
                  ? 'border-[#161412] bg-[#f8f6f1]'
                  : 'border-[#ece7de] bg-[#fbfaf7]'
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedAddressId(address.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black tracking-tight text-[#161412]">
                      {address.fullName}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-full bg-[#161412] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        Default
                      </span>
                    )}
                    {selectedAddressId === address.id && (
                      <CheckCircle2 className="h-4 w-4 text-[#161412]" />
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#6b665f]">{address.formatted}</p>
                </button>

                <div className="flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(address.id)}
                      className="rounded-full border border-[#ddd7cc] bg-white px-3 py-2 text-xs font-bold text-[#161412]"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startAddressEdit(address)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#ddd7cc] bg-white px-3 py-2 text-xs font-bold text-[#161412]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(address.id)}
                    className="rounded-full border border-[#efcdc7] bg-[#fff3f1] px-3 py-2 text-xs font-bold text-[#b34d3f]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AddressEditorForm
        editingAddressId={editingAddressId}
        addressForm={addressForm}
        setAddressForm={setAddressForm}
        postalLookup={postalLookup}
        selectedLocality={selectedLocality}
        setSelectedLocality={setSelectedLocality}
        manualLocality={manualLocality}
        setManualLocality={setManualLocality}
        isManualLocality={isManualLocality}
        setIsManualLocality={setIsManualLocality}
        isSavingAddress={isSavingAddress}
        addressError={addressError}
        resetAddressEditor={resetAddressEditor}
        handleAddressSubmit={handleAddressSubmit}
      />
    </div>
  );
}
