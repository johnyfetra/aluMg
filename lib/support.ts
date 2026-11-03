// Contact du support : un numéro WhatsApp unique, repris partout (menu du profil, vitrine, fenêtre des retours).
// Changer de numéro = modifier cette seule constante (format international, chiffres seulement, sans « + »).
export const SUPPORT_WHATSAPP = "261346143066";
export const SUPPORT_PHONE_DISPLAY = "+261 34 61 430 66";

/** Lien wa.me avec un message prérempli : ouvre WhatsApp (application ou web) sur la conversation avec le support. */
export const supportUrl = (message: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
