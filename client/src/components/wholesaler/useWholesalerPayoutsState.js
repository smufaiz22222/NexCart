import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';

export function useWholesalerPayoutsState() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');

  const profile = user?.wholesalerProfile;
  const [settingsForm, setSettingsForm] = useState({
    useSameAsB2B: profile?.useSameAsB2B ?? true,
    payoutBankName: profile?.payoutBankName || '',
    payoutBankAccountNo: profile?.payoutBankAccountNo || '',
    payoutBankIfsc: profile?.payoutBankIfsc || '',
    payoutUpiId: profile?.payoutUpiId || '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const updatePayoutSettings = (p, name, account, ifsc, upi) => {
    setSettingsForm({
      useSameAsB2B: p,
      payoutBankName: name,
      payoutBankAccountNo: account,
      payoutBankIfsc: ifsc,
      payoutUpiId: upi,
    });
  };

  useEffect(() => {
    if (profile) {
      updatePayoutSettings(
        profile.useSameAsB2B ?? true,
        profile.payoutBankName || '',
        profile.payoutBankAccountNo || '',
        profile.payoutBankIfsc || '',
        profile.payoutUpiId || ''
      );
    }
  }, [profile]);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSettings(true);
      const payload = {
        useSameAsB2B: settingsForm.useSameAsB2B,
        payoutBankName: settingsForm.payoutBankName,
        payoutBankAccountNo: settingsForm.payoutBankAccountNo,
        payoutBankIfsc: settingsForm.payoutBankIfsc,
        payoutUpiId: settingsForm.payoutUpiId,
      };
      await apiClient.put('/payouts/wholesaler/payout-settings', payload);
      toast.success('Payout settlement settings updated successfully!');

      const profileRes = await apiClient.get('/auth/profile');
      if (profileRes.data?.user) {
        setUser(profileRes.data.user);
      }
    } catch (err) {
      console.error('Failed to update payout settings:', err);
      toast.error(err.response?.data?.error || 'Failed to update payout settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleSameAsB2B = async () => {
    const nextVal = !settingsForm.useSameAsB2B;
    setSettingsForm((prev) => ({ ...prev, useSameAsB2B: nextVal }));
    try {
      await apiClient.put('/payouts/wholesaler/payout-settings', {
        useSameAsB2B: nextVal,
        payoutBankName: settingsForm.payoutBankName,
        payoutBankAccountNo: settingsForm.payoutBankAccountNo,
        payoutBankIfsc: settingsForm.payoutBankIfsc,
        payoutUpiId: settingsForm.payoutUpiId,
      });
      const profileRes = await apiClient.get('/auth/profile');
      if (profileRes.data?.user) {
        setUser(profileRes.data.user);
      }
      toast.success(`Switched payout target to ${nextVal ? 'B2B Account' : 'Custom Account'}`);
    } catch {
      toast.error('Failed to change payout target.');
      setSettingsForm((prev) => ({ ...prev, useSameAsB2B: !nextVal }));
    }
  };

  // Fetch summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['wholesalerPayoutSummary'],
    queryFn: async () => {
      const response = await apiClient.get('/payouts/wholesaler/summary');
      return response.data;
    },
  });

  // Fetch past requests
  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['wholesalerPayoutRequests'],
    queryFn: async () => {
      const response = await apiClient.get('/payouts/wholesaler/requests');
      return response.data;
    },
  });

  // Mutation to request payout
  const requestMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/payouts/wholesaler/requests', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payout requested successfully!');
      setAmount('');
      setSupplierNotes('');
      queryClient.invalidateQueries({ queryKey: ['wholesalerPayoutSummary'] });
      queryClient.invalidateQueries({ queryKey: ['wholesalerPayoutRequests'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to submit payout request.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid payout amount greater than zero.');
      return;
    }
    if (summary && val > summary.withdrawableBalance) {
      toast.error('Requested amount exceeds your withdrawable balance.');
      return;
    }
    requestMutation.mutate({ amount: val, supplierNotes });
  };

  const hasBankDetails = settingsForm.useSameAsB2B
    ? profile?.bankAccountNo || profile?.upiId
    : profile?.payoutBankAccountNo || profile?.payoutUpiId;

  const requests = requestsData?.requests || [];

  return {
    user,
    profile,
    amount,
    setAmount,
    supplierNotes,
    setSupplierNotes,
    settingsForm,
    setSettingsForm,
    isSavingSettings,
    handleSaveSettings,
    handleToggleSameAsB2B,
    summary,
    isSummaryLoading,
    isRequestsLoading,
    requestMutation,
    handleSubmit,
    hasBankDetails,
    requests,
  };
}
