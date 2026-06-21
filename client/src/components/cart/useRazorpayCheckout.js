import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import useCartStore from '../../store/cartStore';
import { toast } from 'sonner';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export function useRazorpayCheckout() {
  const navigate = useNavigate();
  const { hydrateCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleRazorpayCheckout = async (selectedAddressId) => {
    setCheckoutError('');
    setIsProcessing(true);

    try {
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load Razorpay checkout. Please try again.');
      }

      const createResponse = await apiClient.post('/orders/prepaid/create', {
        addressId: selectedAddressId,
        paymentMethod: 'PREPAID',
      });

      const { keyId, razorpayOrderId, amount, currency } = createResponse.data;

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount,
          currency,
          name: 'NexCart',
          description: 'Marketplace prepaid order',
          order_id: razorpayOrderId,
          handler: async (response) => {
            try {
              await apiClient.post('/orders/prepaid/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              await hydrateCart();
              navigate('/store/dashboard/orders');
              toast.success('Prepaid order placed successfully!');
              resolve();
            } catch (verificationError) {
              reject(
                new Error(verificationError.response?.data?.error || 'Payment verification failed')
              );
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user')),
          },
          theme: {
            color: '#161412',
          },
        });

        razorpay.open();
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Checkout failed';
      setCheckoutError(errorMsg);
      throw new Error(errorMsg, { cause: error });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    checkoutError,
    setCheckoutError,
    handleRazorpayCheckout,
  };
}
