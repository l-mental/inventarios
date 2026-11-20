import { Product } from '../types';
import zincOnduladaImg from '../assets/images/calamina_zinc_ondulada_1795139681242.jpg';
import rojaTejaImg from '../assets/images/calamina_roja_teja_1795139681028.jpg';
import azulTrapezoidalImg from '../assets/images/calamina_azul_trapezoidal_1795139680949.jpg';
import verdeTrapezoidalImg from '../assets/images/calamina_verde_trapezoidal_1795139681356.jpg';
import antracitaOnduladaImg from '../assets/images/calamina_antracita_ondulada_1795139681264.jpg';
import translucidaImg from '../assets/images/calamina_translucida_policarbonato_1795139681734.jpg';

export const CALAMINA_IMAGES = {
  zincOndulada: zincOnduladaImg,
  rojaTeja: rojaTejaImg,
  azulTrapezoidal: azulTrapezoidalImg,
  verdeTrapezoidal: verdeTrapezoidalImg,
  antracitaOndulada: antracitaOnduladaImg,
  translucida: translucidaImg,
} as const;

const IMAGE_PATH_MAP: Record<string, string> = {
  '/src/assets/images/calamina_zinc_ondulada_1795139681242.jpg': zincOnduladaImg,
  '/src/assets/images/calamina_roja_teja_1795139681028.jpg': rojaTejaImg,
  '/src/assets/images/calamina_azul_trapezoidal_1795139680949.jpg': azulTrapezoidalImg,
  '/src/assets/images/calamina_verde_trapezoidal_1795139681356.jpg': verdeTrapezoidalImg,
  '/src/assets/images/calamina_antracita_ondulada_1795139681264.jpg': antracitaOnduladaImg,
  '/src/assets/images/calamina_translucida_policarbonato_1795139681734.jpg': translucidaImg,
};

export const CALAMINA_CATEGORIES = [
  'Calamina Ondulada',
  'Calamina Trapezoidal',
  'Calamina Teja Colonial',
  'Calamina Translúcida',
  'Cumbreras y Canaletas',
  'Packs de Techo',
  'Accesorios y Tornillería',
] as const;

export const CALAMINA_DESIGNS = [
  'Ondulada Sinusoidal',
  'Trapezoidal TR4',
  'Teja Colonial Española',
  'Translúcida Policarbonato',
  'Cumbrera / Remate',
  'Pack Completo',
] as const;

export const CALAMINA_COLOR_SWATCHES = [
  { name: 'Zinc Galvanizado', hex: '#94a3b8', image: CALAMINA_IMAGES.zincOndulada },
  { name: 'Rojo Teja', hex: '#b91c1c', image: CALAMINA_IMAGES.rojaTeja },
  { name: 'Azul Rey', hex: '#1d4ed8', image: CALAMINA_IMAGES.azulTrapezoidal },
  { name: 'Verde Bosque', hex: '#15803d', image: CALAMINA_IMAGES.verdeTrapezoidal },
  { name: 'Gris Antracita', hex: '#334155', image: CALAMINA_IMAGES.antracitaOndulada },
  { name: 'Cristal Translúcido', hex: '#cbd5e1', image: CALAMINA_IMAGES.translucida },
] as const;

export const CALAMINA_THICKNESSES = ['0.30 mm', '0.35 mm', '0.40 mm', '0.45 mm', '0.50 mm', '0.80 mm (PC)'] as const;

export const STANDARD_CUT_LENGTHS = [2.0, 2.5, 3.0, 3.6, 4.0, 5.0, 6.0] as const;

export function resolveCalaminaImage(product: Partial<Product>): string {
  if (product.image_url) {
    if (IMAGE_PATH_MAP[product.image_url]) {
      return IMAGE_PATH_MAP[product.image_url];
    }
    return product.image_url;
  }

  const text = `${product.name || ''} ${product.color_name || ''} ${product.design_type || ''} ${product.category || ''}`.toLowerCase();

  if (text.includes('translúcida') || text.includes('translucida') || text.includes('policarbonato') || text.includes('cristal')) {
    return CALAMINA_IMAGES.translucida;
  }
  if (text.includes('teja') || text.includes('rojo') || text.includes('terracota')) {
    return CALAMINA_IMAGES.rojaTeja;
  }
  if (text.includes('azul')) {
    return CALAMINA_IMAGES.azulTrapezoidal;
  }
  if (text.includes('verde')) {
    return CALAMINA_IMAGES.verdeTrapezoidal;
  }
  if (text.includes('antracita') || text.includes('negro') || text.includes('grafito') || text.includes('gris oscuro')) {
    return CALAMINA_IMAGES.antracitaOndulada;
  }
  return CALAMINA_IMAGES.zincOndulada;
}

export function formatMeter(value: number): string {
  const num = Number(value || 0);
  return `${num.toLocaleString('es-BO', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} m`;
}
