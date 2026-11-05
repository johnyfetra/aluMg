// Unités : le métier raisonne en millimètres, le moteur 3D en mètres. Toute conversion passe par ici.
export const MM = 0.001;
export const toEngine = (mm: number) => mm * MM;
export const fromEngine = (m: number) => Math.round(m / MM);
