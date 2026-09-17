export const normalizeIndianMobileInput = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  return null;
};

export const formatMaskedIndianMobile = (phone: string) => {
  const normalized = normalizeIndianMobileInput(phone) ?? phone.replace(/\D/g, '').slice(-10);
  if (normalized.length !== 10) {
    return phone;
  }

  return `+91 ${normalized.slice(0, 5)}••••${normalized.slice(8)}`;
};

export const isValidOtp = (otp: string) => /^\d{4}$/.test(otp);
