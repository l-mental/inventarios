import React, { useState } from 'react';
import { Product } from '../types';
import { resolveCalaminaImage } from '../lib/calaminaCatalog';

export interface CalaminaImageProps {
  product?: Partial<Product>;
  src?: string;
  alt?: string;
  colorHex?: string;
  aspectClass?: string;
  showColorDot?: boolean;
  className?: string;
}

export default function CalaminaImage({
  product,
  src: explicitSrc,
  alt: explicitAlt,
  colorHex,
  aspectClass,
  showColorDot = false,
  className = '',
}: CalaminaImageProps) {
  const [hasError, setHasError] = useState(false);
  const src = explicitSrc || resolveCalaminaImage(product || {});
  const swatchColor = colorHex || product?.color_hex || '#64748b';
  const altText =
    explicitAlt ||
    `${product?.name || 'Calamina metálica'} - ${product?.color_name || 'Galvanizada'} (${product?.design_type || product?.category || 'Perfil'})`;
  const containerClass = aspectClass ? `${aspectClass} ${className}` : className || 'w-full h-36';

  if (hasError) {
    return (
      <div
        className={`${containerClass} relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-700`}
      >
        <svg viewBox="0 0 120 40" className="w-20 h-8 opacity-80" fill="none">
          <path
            d="M4 28 Q 14 10, 24 28 T 44 28 T 64 28 T 84 28 T 104 28 T 116 20"
            stroke={swatchColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M4 34 Q 14 16, 24 34 T 44 34 T 64 34 T 84 34 T 104 34 T 116 26"
            stroke={swatchColor}
            strokeWidth="2"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 text-center truncate max-w-full">
          {product?.design_type || product?.category || explicitAlt || 'Calamina'}
        </span>
      </div>
    );
  }

  return (
    <div className={`${containerClass} relative overflow-hidden bg-slate-100 dark:bg-slate-800`}>
      <img
        src={src}
        alt={altText}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
      {showColorDot && (
        <span
          className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: swatchColor }}
          title={product?.color_name || 'Color'}
        />
      )}
    </div>
  );
}
