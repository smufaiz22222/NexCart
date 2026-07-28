import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
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
  const [showForm, setShowForm] = useState(false);

  const handleAddNew = () => {
    startAddressEdit(null);
    setShowForm(true);
  };

  const handleEditAddress = (address) => {
    startAddressEdit(address);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    resetAddressEditor();
    setShowForm(false);
  };

  const handleAddressCardKeyDown = (event, addressId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedAddressId(addressId);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 border border-[#e2e8f0] shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#4f46e5]" />
          <h3 className="text-sm font-bold text-[#0f172a]">Delivery Address</h3>
        </div>
      </div>

      {/* Address Cards - Horizontal */}
      {isAddressLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-[#64748b]">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#4f46e5]" />
          Loading addresses...
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-6">
          <p className="text-sm text-[#64748b] mb-3">No saved addresses yet.</p>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#4338ca] transition-all btn-press"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Address
          </button>
        </div>
      ) : (
        !showForm && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => {
              const isSelected = selectedAddressId === address.id;
              return (
                <div
                  key={address.id}
                  className={cn(
                    'relative rounded-xl border p-4 transition-all',
                    isSelected
                      ? 'border-[#4f46e5] bg-[#eef2ff] shadow-sm'
                      : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-[#4f46e5]/40'
                  )}
                >
                  {/* Clickable selector button for the entire card area */}
                  <button
                    type="button"
                    aria-label={`Select address for ${address.fullName}`}
                    onClick={() => setSelectedAddressId(address.id)}
                    onKeyDown={(event) => handleAddressCardKeyDown(event, address.id)}
                    className="absolute inset-0 w-full h-full cursor-pointer rounded-xl focus:outline-none"
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-[#4f46e5] pointer-events-none" />
                  )}

                  {/* Content wrapper with pointer-events-none so click goes through to selector button */}
                  <div className="pointer-events-none relative mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-xs font-bold text-[#0f172a] truncate">
                        {address.fullName}
                      </p>
                      {address.isDefault && (
                        <span className="rounded bg-[#4f46e5] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#64748b] line-clamp-2 leading-4">
                      {address.formatted}
                    </p>
                  </div>

                  {/* Actions (relative and pointer-events-auto to receive clicks) */}
                  <div className="relative z-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAddress(address);
                      }}
                      className="text-[10px] font-bold text-[#64748b] hover:text-[#4f46e5] transition-colors cursor-pointer bg-transparent border-0 p-0"
                      aria-label="Edit address"
                    >
                      Edit
                    </button>
                    {!address.isDefault && (
                      <>
                        <span className="text-[#e2e8f0] pointer-events-none">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultAddress(address.id);
                          }}
                          className="text-[10px] font-bold text-[#64748b] hover:text-[#4f46e5] transition-colors cursor-pointer bg-transparent border-0 p-0"
                          aria-label="Set default address"
                        >
                          Set Default
                        </button>
                      </>
                    )}
                    <span className="text-[#e2e8f0] pointer-events-none">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(address.id);
                      }}
                      className="text-[10px] font-bold text-[#64748b] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0 p-0"
                      aria-label="Remove address"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add new card */}
            <button
              type="button"
              onClick={handleAddNew}
              className="flex min-h-[132px] rounded-xl border border-dashed border-[#c7d2fe] bg-[#eef2ff]/50 p-4 flex-col items-center justify-center gap-2 hover:border-[#4f46e5] hover:bg-[#eef2ff] transition-all"
            >
              <Plus className="h-5 w-5 text-[#4f46e5]" />
              <span className="text-[10px] font-bold text-[#4f46e5]">Add New</span>
            </button>
          </div>
        )
      )}

      {/* Address Form - shown only on demand */}
      {showForm && (
        <div className="mt-4">
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
            resetAddressEditor={handleCancelForm}
            handleAddressSubmit={(e) => {
              handleAddressSubmit(e);
              setShowForm(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
