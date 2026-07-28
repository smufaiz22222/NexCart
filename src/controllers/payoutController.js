import * as payoutService from '../services/payoutService.js';

export const getWholesalerPayoutSummary = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const summary = await payoutService.calculateWholesalerEarnings(wholesalerId);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching wholesaler payout summary:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch payout summary.' });
  }
};

export const getWholesalerPayoutRequests = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const requests = await payoutService.getWholesalerPayoutRequests(wholesalerId);
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching wholesaler payout requests:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch payout requests.' });
  }
};

export const createWholesalerPayoutRequest = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { amount, supplierNotes } = req.body;

    const payout = await payoutService.requestPayout({
      wholesalerId,
      amount,
      supplierNotes,
    });

    res.status(201).json({ message: 'Payout requested successfully.', payout });
  } catch (error) {
    console.error('Error creating payout request:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to request payout.' });
  }
};

export const adminGetAllPayoutRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await payoutService.adminGetAllPayoutRequests(status);
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching all payout requests:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch payout requests.' });
  }
};

export const adminApprovePayoutRequest = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionRef, adminNotes } = req.body;

    const payout = await payoutService.adminApprovePayoutRequest({
      payoutId,
      transactionRef,
      adminNotes,
    });

    res.status(200).json({ message: 'Payout approved successfully.', payout });
  } catch (error) {
    console.error('Error approving payout request:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to approve payout request.' });
  }
};

export const adminRejectPayoutRequest = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { adminNotes } = req.body; // acts as the rejection reason

    const payout = await payoutService.adminRejectPayoutRequest({
      payoutId,
      adminNotes,
    });

    res.status(200).json({ message: 'Payout rejected successfully.', payout });
  } catch (error) {
    console.error('Error rejecting payout request:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to reject payout request.' });
  }
};

export const updateWholesalerPayoutSettings = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { useSameAsB2B, payoutBankName, payoutBankAccountNo, payoutBankIfsc, payoutUpiId } =
      req.body;

    const updatedWholesaler = await payoutService.updateWholesalerPayoutSettings({
      wholesalerId,
      useSameAsB2B,
      payoutBankName,
      payoutBankAccountNo,
      payoutBankIfsc,
      payoutUpiId,
    });

    res.status(200).json({
      message: 'Payout settlement settings updated successfully.',
      wholesaler: updatedWholesaler,
    });
  } catch (error) {
    console.error('Error updating payout settings:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to update payout settings.' });
  }
};
