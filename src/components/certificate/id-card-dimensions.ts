/** ID karta standart o'lchami (gorizontal): eni × balandligi. */
export const ID_CARD_WIDTH_CM = 8.5;
export const ID_CARD_HEIGHT_CM = 5.5;

export const ID_CARD_WIDTH_MM = 85;
export const ID_CARD_HEIGHT_MM = 55;

export const ID_CARD_ASPECT_CLASS = 'aspect-[85/55]' as const;

/** Ekranda haqiqiy o'lcham. */
export const ID_CARD_SCENE_CLASS = 'w-[8.5cm]' as const;
export const ID_CARD_FACE_CLASS = 'w-[8.5cm] h-[5.5cm]' as const;

/** Chop etish. */
export const ID_CARD_PRINT_CLASS = 'w-[85mm] h-[55mm]' as const;

export const ID_CARD_SIZE_LABEL = '8,5 × 5,5 sm';

/** 3×4 rasm maydoni (sm). */
export const ID_CARD_PHOTO_CLASS =
  'relative w-[2.5cm] h-[2.7cm] shrink-0 overflow-hidden rounded-[1cqw]' as const;

/** QR maydoni (sm). */
export const ID_CARD_QR_BOX_CLASS =
  'aspect-square w-[2.15cm] shrink-0 rounded-[1cqw] bg-white p-[0.12cm] shadow-[0_2px_8px_rgba(0,0,0,0.35)]' as const;
