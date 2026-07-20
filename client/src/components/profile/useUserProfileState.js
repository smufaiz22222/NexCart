import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

export function useUserProfileState() {
  const { user, setUser } = useAuthStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // Email change OTP flow state
  const [emailChangeStep, setEmailChangeStep] = useState(null); // null | 'enterNew' | 'verifyOld' | 'verifyNew'
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailChangeOtp, setEmailChangeOtp] = useState('');
  const [emailChangeNewEmail, setEmailChangeNewEmail] = useState('');
  const [isEmailChangeLoading, setIsEmailChangeLoading] = useState(false);

  const handleStartEditProfile = () => {
    setProfileForm({
      name: user?.name || '',
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

  // Email Change Handlers
  const handleStartEmailChange = () => {
    setNewEmailInput('');
    setEmailChangeOtp('');
    setEmailChangeNewEmail('');
    setEmailChangeStep('enterNew');
  };

  const handleCancelEmailChange = () => {
    setEmailChangeStep(null);
    setNewEmailInput('');
    setEmailChangeOtp('');
    setEmailChangeNewEmail('');
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Please enter a new email address');
      return;
    }
    if (trimmed === user?.email) {
      toast.error('New email is the same as your current email');
      return;
    }

    setIsEmailChangeLoading(true);
    try {
      await apiClient.post('/auth/request-email-change', { newEmail: trimmed });
      setEmailChangeNewEmail(trimmed);
      setEmailChangeOtp('');
      setEmailChangeStep('verifyOld');
      toast.success('Verification code sent to your current email');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsEmailChangeLoading(false);
    }
  };

  const handleVerifyOldEmail = async (e) => {
    e.preventDefault();
    if (!emailChangeOtp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setIsEmailChangeLoading(true);
    try {
      await apiClient.post('/auth/verify-old-email-otp', { otp: emailChangeOtp.trim() });
      setEmailChangeOtp('');
      setEmailChangeStep('verifyNew');
      toast.success('Current email verified. Code sent to your new email');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setIsEmailChangeLoading(false);
    }
  };

  const handleVerifyNewEmail = async (e) => {
    e.preventDefault();
    if (!emailChangeOtp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setIsEmailChangeLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-new-email-otp', {
        otp: emailChangeOtp.trim(),
        newEmail: emailChangeNewEmail,
      });
      setUser(res.data.user);
      toast.success('Email address updated successfully!');
      handleCancelEmailChange();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify new email');
    } finally {
      setIsEmailChangeLoading(false);
    }
  };

  // Addresses State and Handlers
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

  return {
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
  };
}
