const PASSWORD_REQUIREMENTS = [
  { pattern: /.{8,}/, message: 'Password must be at least 8 characters long' },
  { pattern: /[A-Z]/, message: 'Password must include at least one uppercase letter' },
  { pattern: /[a-z]/, message: 'Password must include at least one lowercase letter' },
  { pattern: /\d/, message: 'Password must include at least one number' },
  { pattern: /[^A-Za-z0-9]/, message: 'Password must include at least one special character' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_REGISTRATION_ROLES = new Set(['CUSTOMER', 'WHOLESALER']);

export const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

export const validateEmail = (email) => EMAIL_PATTERN.test(normalizeEmail(email));

export const validatePassword = (password) =>
  PASSWORD_REQUIREMENTS.find(({ pattern }) => !pattern.test(password || ''))?.message || null;

export const validateRegistrationPayload = ({ name, email, password, role, businessName }) => {
  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole =
    role === 'WHOLESALER' ? 'WHOLESALER' : role === undefined ? 'CUSTOMER' : role;
  const trimmedBusinessName = String(businessName || '').trim();

  if (!trimmedName) {
    return { error: 'Full name is required' };
  }

  if (!normalizedEmail) {
    return { error: 'Email is required' };
  }

  if (!validateEmail(normalizedEmail)) {
    return { error: 'Enter a valid email address' };
  }

  if (!password) {
    return { error: 'Password is required' };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (!SELF_REGISTRATION_ROLES.has(normalizedRole)) {
    return { error: 'Invalid account type selected' };
  }

  if (normalizedRole === 'WHOLESALER' && !trimmedBusinessName) {
    return { error: 'Business name is required for wholesalers' };
  }

  return {
    value: {
      name: trimmedName,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      businessName: trimmedBusinessName,
    },
  };
};
