import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserRound,
  Mail,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Shield,
  Phone,
  Home,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import apiClient from '../api/axios';
import { toast } from 'sonner';

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const handleStartEditProfile = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setChangePassword(false);
    setIsEditingProfile(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!profileForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (changePassword) {
      if (!profileForm.currentPassword) {
        toast.error('Current password is required to change password');
        return;
      }
      if (!profileForm.newPassword) {
        toast.error('New password is required');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmNewPassword) {
        toast.error('New passwords do not match');
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      };
      if (changePassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }
      const res = await apiClient.put('/auth/profile', payload);
      setUser(res.data.user);
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
      setChangePassword(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [addresses, setAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoadingAddresses(true);
      const res = await apiClient.get('/addresses');
      setAddresses(res.data.addresses || []);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/profile');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to sync profile:', err);
      }
    };
    fetchProfile();
  }, [setUser]);

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await apiClient.put(`/addresses/${editingAddress.id}`, addressForm);
        toast.success('Address updated successfully');
      } else {
        await apiClient.post('/addresses', addressForm);
        toast.success('Address added successfully');
      }
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        fullName: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
      fetchAddresses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await apiClient.delete(`/addresses/${id}`);
      toast.success('Address removed');
      fetchAddresses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await apiClient.patch(`/addresses/${id}/default`);
      toast.success('Default address updated');
      fetchAddresses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set default');
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || 'India',
    });
    setShowAddressForm(true);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      {/* Back button */}
      <button
        onClick={() => navigate('/store')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Store
      </button>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Profile</h1>

      {/* Account Information Card */}
      <section className="swiss-panel p-6 mb-8 bg-white border border-[#ddd7cc] rounded-xl">
        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-[#161412] mb-4">Edit Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#EFEFEF]">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="w-4 h-4 text-[#0047AB] border-[#C0C0C0] rounded focus:ring-[#0047AB]"
                />
                <span className="text-xs font-semibold text-[#161412]">Change Password</span>
              </label>
            </div>

            {changePassword && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 animate-fade-in-up">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, currentPassword: e.target.value })
                    }
                    required={changePassword}
                    className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, newPassword: e.target.value })
                    }
                    required={changePassword}
                    className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={profileForm.confirmNewPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, confirmNewPassword: e.target.value })
                    }
                    required={changePassword}
                    className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-[#EFEFEF]">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 bg-[#0047AB] hover:bg-[#003B91] disabled:bg-gray-400 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setChangePassword(false);
                }}
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 border border-[#C0C0C0] text-[#6C757D] rounded-lg text-xs font-semibold hover:bg-[#EFEFEF] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-[#161412] text-white flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#161412]">{user?.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-sm text-[#6C757D]">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-[#6C757D]">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="capitalize">{user?.role?.toLowerCase()} Account</span>
                </div>
                {user?.businessProfile?.verification === 'APPROVED' ? (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      B2B Verified Business
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      B2C Retail Customer
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    B2C Retail Customer
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleStartEditProfile}
              className="flex items-center gap-1.5 px-3 py-2 border border-[#C0C0C0] hover:border-[#161412] hover:bg-[#faf9f7] text-[#161412] rounded-lg text-xs font-semibold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        )}

        {/* Member details grid - always visible */}
        <div className="mt-6 pt-5 border-t border-[#EFEFEF]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-[#faf9f7] border border-[#EFEFEF]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C757D]">
                Member Since
              </p>
              <p className="mt-1 font-semibold text-[#161412]">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#faf9f7] border border-[#EFEFEF]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C757D]">
                Saved Addresses
              </p>
              <p className="mt-1 font-semibold text-[#161412]">{addresses.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#faf9f7] border border-[#EFEFEF]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C757D]">
                Account Type
              </p>
              <p className="mt-1 font-semibold text-[#161412]">
                {user?.businessProfile?.verification === 'APPROVED'
                  ? 'Business (B2B) & Retail (B2C)'
                  : 'Personal (B2C)'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping Addresses Section */}
      <section className="swiss-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#161412] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0047AB]" />
              Shipping Addresses
            </h2>
            <p className="text-xs text-[#6C757D] mt-1">
              Manage your delivery addresses for faster checkout
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAddress(null);
              setAddressForm({
                fullName: '',
                phone: '',
                street: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'India',
              });
              setShowAddressForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0047AB] hover:bg-[#003B91] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Address
          </button>
        </div>

        {/* Address Form */}
        {showAddressForm && (
          <form
            onSubmit={handleAddressSubmit}
            className="mb-6 p-5 rounded-xl border border-[#ddd7cc] bg-[#faf9f7] space-y-4"
          >
            <h3 className="text-sm font-bold text-[#161412]">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="Recipient name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="10-digit phone number"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                placeholder="House/Flat number, Street, Area"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C757D] mb-1.5">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#C0C0C0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20 focus:border-[#0047AB]"
                  placeholder="6-digit PIN"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0047AB] hover:bg-[#003B91] text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {editingAddress ? 'Update Address' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="px-5 py-2.5 border border-[#C0C0C0] text-[#6C757D] rounded-lg text-xs font-semibold hover:bg-[#EFEFEF] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Addresses List */}
        {isLoadingAddresses ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-lg bg-[#EFEFEF] border border-[#C0C0C0]" />
            <div className="h-24 rounded-lg bg-[#EFEFEF] border border-[#C0C0C0]" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#C0C0C0] rounded-xl">
            <Home className="w-10 h-10 text-[#C0C0C0] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#6C757D]">No saved addresses yet</p>
            <p className="text-xs text-[#6C757D] mt-1">
              Add an address to speed up your checkout experience
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-4 rounded-xl border transition-colors ${
                  addr.isDefault
                    ? 'border-[#0047AB] bg-blue-50/30'
                    : 'border-[#ddd7cc] bg-white hover:border-[#6C757D]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#161412]">{addr.fullName}</p>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#0047AB]/10 text-[#0047AB] border border-[#0047AB]/20">
                          <Star className="w-2.5 h-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6C757D] mt-1">{addr.street}</p>
                    <p className="text-xs text-[#6C757D]">
                      {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                    {addr.phone && (
                      <p className="text-xs text-[#6C757D] mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {addr.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="p-2 rounded-lg text-[#6C757D] hover:text-[#0047AB] hover:bg-[#EFEFEF] transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(addr)}
                      className="p-2 rounded-lg text-[#6C757D] hover:text-[#161412] hover:bg-[#EFEFEF] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-2 rounded-lg text-[#6C757D] hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
