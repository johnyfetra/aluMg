import { z } from "zod";

// Image reçue en data URL : formats raster uniquement (jamais de SVG, qui peut embarquer des scripts), taille bornée.
export const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const dataImage = (maxLen: number) => z.string().max(maxLen).refine((v) => v === "" || DATA_IMAGE.test(v), "image");
