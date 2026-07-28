import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  UserProfileAccountCard,
  UserEmailChangeFlow,
  UserProfileMemberStats,
  UserAddressSection,
} from '../components/profile/UserProfileComponents';
import { useUserProfileState } from '../components/profile/useUserProfileState';

export default function UserProfile() {
  const navigate = useNavigate();
  const {
    user,
    initials,
    isEditingProfile,
    setIsEditingProfile,
    isUpdatingProfile,
    changePassword,
    setChangePassword,
    profileForm,
    setProfileForm,
    handleStartEditProfile,
    handleProfileSubmit,
    emailChangeStep,
    newEmailInput,
    setNewEmailInput,
    emailChangeOtp,
    setEmailChangeOtp,
    emailChangeNewEmail,
    isEmailChangeLoading,
    handleStartEmailChange,
    handleCancelEmailChange,
    handleRequestEmailChange,
    handleVerifyOldEmail,
    handleVerifyNewEmail,
    addresses,
    isLoadingAddresses,
    showAddressForm,
    setShowAddressForm,
    editingAddress,
    setEditingAddress,
    addressForm,
    setAddressForm,
    handleAddressSubmit,
    handleDeleteAddress,
    handleSetDefault,
    handleEditAddress,
  } = useUserProfileState();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 font-sans text-[#16171a] sm:py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/store')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Store
      </button>

      <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">Your Profile</h1>

      {/* Account Information Card & Email Flow & Stats */}
      <div className="mb-8 bg-white border border-[#ddd7cc] rounded-xl p-6">
        <UserProfileAccountCard
          isEditingProfile={isEditingProfile}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          handleProfileSubmit={handleProfileSubmit}
          isUpdatingProfile={isUpdatingProfile}
          setIsEditingProfile={setIsEditingProfile}
          changePassword={changePassword}
          setChangePassword={setChangePassword}
          user={user}
          initials={initials}
          handleStartEditProfile={handleStartEditProfile}
          handleStartEmailChange={handleStartEmailChange}
        />

        <UserEmailChangeFlow
          emailChangeStep={emailChangeStep}
          handleCancelEmailChange={handleCancelEmailChange}
          handleRequestEmailChange={handleRequestEmailChange}
          newEmailInput={newEmailInput}
          setNewEmailInput={setNewEmailInput}
          isEmailChangeLoading={isEmailChangeLoading}
          handleVerifyOldEmail={handleVerifyOldEmail}
          emailChangeOtp={emailChangeOtp}
          setEmailChangeOtp={setEmailChangeOtp}
          user={user}
          handleVerifyNewEmail={handleVerifyNewEmail}
          emailChangeNewEmail={emailChangeNewEmail}
        />

        <UserProfileMemberStats user={user} addressesLength={addresses.length} />
      </div>

      {/* Shipping Addresses Section */}
      <UserAddressSection
        showAddressForm={showAddressForm}
        handleAddressSubmit={handleAddressSubmit}
        editingAddress={editingAddress}
        addressForm={addressForm}
        setAddressForm={setAddressForm}
        setShowAddressForm={setShowAddressForm}
        setEditingAddress={setEditingAddress}
        isLoadingAddresses={isLoadingAddresses}
        addresses={addresses}
        handleSetDefault={handleSetDefault}
        handleEditAddress={handleEditAddress}
        handleDeleteAddress={handleDeleteAddress}
      />
    </div>
  );
}
