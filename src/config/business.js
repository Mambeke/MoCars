export const businessConfig = {
  name: 'MoCars',
  phone: import.meta.env.VITE_BUSINESS_PHONE || '',
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '',
  email: import.meta.env.VITE_BUSINESS_EMAIL || '',
  address: import.meta.env.VITE_BUSINESS_ADDRESS || '',
  social: {
    facebook: import.meta.env.VITE_FACEBOOK_URL || '',
    instagram: import.meta.env.VITE_INSTAGRAM_URL || '',
    x: import.meta.env.VITE_X_URL || '',
  },
};

export function whatsappLink(message) {
  const digits = businessConfig.whatsapp.replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function telLink() {
  return businessConfig.phone ? `tel:${businessConfig.phone.replace(/\s/g, '')}` : '';
}
