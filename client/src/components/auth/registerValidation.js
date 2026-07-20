export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordChecks = [
  { pattern: /.{8,}/, message: 'Use at least 8 characters.' },
  { pattern: /[A-Z]/, message: 'Include at least one uppercase letter.' },
  { pattern: /[a-z]/, message: 'Include at least one lowercase letter.' },
  { pattern: /\d/, message: 'Include at least one number.' },
  { pattern: /[^A-Za-z0-9]/, message: 'Include at least one special character.' },
];

export function validateRegistrationForm(formData) {
  const name = formData.name.trim();
  const email = formData.email.trim().toLowerCase();
  if (!name) return 'Full name is required.';
  if (!email) return 'Email address is required.';
  if (!emailPattern.test(email)) return 'Enter a valid email address.';
  if (!formData.password) return 'Password is required.';
  const msg = passwordChecks.find(({ pattern }) => !pattern.test(formData.password))?.message;
  if (msg) return msg;
  if (!formData.confirmPassword) return 'Confirm your password.';
  if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
  if (formData.role === 'WHOLESALER') {
    if (!formData.businessName.trim()) return 'Business name is required.';
    if (!formData.businessPhone.trim()) return 'Business phone is required.';
    if (!formData.businessAddress.trim()) return 'Business address is required.';
  }
  return null;
}

export const initialOtpState = {
  show: false,
  code: '',
  tempData: null,
  error: '',
  isLoading: false,
  isResending: false,
};

export function otpReducer(state, action) {
  switch (action.type) {
    case 'SHOW':
      return {
        ...state,
        show: true,
        tempData: action.payload,
        code: '',
        error: '',
        isLoading: false,
        isResending: false,
      };
    case 'SET_CODE':
      return { ...state, code: action.payload, error: '' };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isResending: false };
    case 'START_VERIFY':
      return { ...state, isLoading: true, error: '' };
    case 'END_VERIFY':
      return { ...state, isLoading: false };
    case 'START_RESEND':
      return { ...state, isResending: true, error: '' };
    case 'END_RESEND':
      return { ...state, isResending: false };
    case 'RESET':
      return initialOtpState;
    default:
      return state;
  }
}
