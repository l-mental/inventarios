import { Product, Supplier } from '../types';

export const TRACTOR_CATEGORIES = [
  'MOTOR',
  'TRANSMISION',
  'TREN DELANTERO',
  'EJE TRASERO',
  'SISTEMA HIDRAULICO',
  'SISTEMA ELECTRICO',
  'FRENOS',
  'ENGANCHE Y ACC GENERAL',
  'ACCESORIOS / IM GENERAL',
  'FILTROS',
  'CABINA / CHAPA',
  'NINGUNO',
] as const;

export const TRACTOR_BRANDS = [
  'MASSEY FERGUSON',
  'NEW HOLLAND',
  'FIAT',
  'VALMET VALTRA',
  'UNIVERSAL',
  'GENERAL',
  'TODOS',
] as const;

export const TRACTOR_UNITS = ['UNIDAD', 'JUEGO', 'N/A'] as const;

export const TRACTOR_SUPPLIERS_LIST = [
  'BETTY VALLE GRANDE',
  'QTP - QUALITY TRACTOR PARTS',
  'MORELL POWER TRAIN',
  'GB - RICAMBI S.P.A',
  'TVH DELLAROSA',
  'EMMARK BETTY',
  'INDISA / TVH BRA',
  'MEC DIESEL OMP',
  'OMP MEC DIESEL',
  'CAPRONI ITALIAN',
  'CNH-GB',
  'SMY SAHIM',
  'SAHIM-SMY',
  'CORTECO / QTP',
  'KOLBENSCHMIDT',
  'TUZZI',
  'YENIPARK - DEVO',
  'GENERAL',
  'N/A',
] as const;

export const DEFAULT_TRACTOR_SUPPLIERS: Supplier[] = [
  { id: 1, name: 'BETTY VALLE GRANDE', phone: '77410200', email: 'ventas@bettyvallegrande.com', address: 'Santa Cruz / Vallegrande' },
  { id: 2, name: 'QTP - QUALITY TRACTOR PARTS', phone: '76520300', email: 'import@qtp-parts.com', address: 'Distribuidor Oficial QTP' },
  { id: 3, name: 'GB - RICAMBI S.P.A', phone: '75430400', email: 'ricambi@gbgroup.it', address: 'Modena / Representante Regional' },
  { id: 4, name: 'TVH DELLAROSA', phone: '74340500', email: 'pedidos@tvhdellarosa.com', address: 'Zona Industrial Maquinaria' },
  { id: 5, name: 'EMMARK BETTY', phone: '73250600', email: 'motor@emmark-parts.com', address: 'División Motores Perkins / Fiat' },
  { id: 6, name: 'MORELL POWER TRAIN', phone: '72160700', email: 'ventas@morellpowertrain.com', address: 'Transmisión y Frenos Agrícolas' },
  { id: 7, name: 'INDISA / TVH BRA', phone: '71070800', email: 'brasil@indisatvh.com', address: 'Importación Línea Eléctrica' },
  { id: 8, name: 'MEC DIESEL OMP', phone: '70980900', email: 'neff@mecdiesel.it', address: 'Componentes Motor NEF / CNH' },
  { id: 9, name: 'CAPRONI ITALIAN', phone: '78891000', email: 'hidraulica@caproni.it', address: 'Bombas y Reparos Hidráulicos' },
  { id: 10, name: 'SMY SAHIM', phone: '77791100', email: 'motor@smysahim.com', address: 'Cojinetes y Repuestos Motor' },
  { id: 11, name: 'TUZZI', phone: '76691200', email: 'implementos@tuzzi.com', address: 'Enganches y Tercer Punto' },
  { id: 12, name: 'YENIPARK - DEVO', phone: '75591300', email: 'export@yeniparkdevo.com', address: 'Camisas y Conjuntos Motor' },
  { id: 13, name: 'CORTECO / QTP', phone: '74491400', email: 'retenes@corteco-qtp.com', address: 'Retenes y Sellos Alemanes' },
  { id: 14, name: 'KOLBENSCHMIDT', phone: '73391500', email: 'empaques@ks-motor.de', address: 'Empaquetaduras y Motor' },
  { id: 15, name: 'CNH-GB', phone: '72291600', email: 'repuestos@cnh-gb.com', address: 'Línea Fiat / New Holland' },
];

export type StockStatus = 'sin_stock' | 'bajo' | 'normal';

export function getStockStatus(product: Pick<Product, 'stock' | 'min_stock'>): StockStatus {
  const stock = Number(product.stock || 0);
  const minStock = product.min_stock !== undefined ? Number(product.min_stock) : 0;
  if (stock <= 0) return 'sin_stock';
  if (minStock > 0 && stock <= minStock) return 'bajo';
  return 'normal';
}

export function getBrandAccent(brand?: string): { bg: string; text: string; border: string } {
  const b = (brand || '').toUpperCase();
  if (b.includes('MASSEY')) {
    return {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-900/50',
    };
  }
  if (b.includes('NEW HOLLAND')) {
    return {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-900/50',
    };
  }
  if (b.includes('FIAT')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900/50',
    };
  }
  if (b.includes('VALMET')) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/50',
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  };
}

interface RawTractorPart {
  id: number;
  code: string;
  oem: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  supplier: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
}

const RAW_PARTS: RawTractorPart[] = [
  { id: 1, code: '5033', oem: '333 053 10 - 87690862 - 333 053 10 - 333053.10 0.6241-BETTY', name: 'DISCO ORGANICO C/RESORTE 11" Z10 D=28/38 EJE', category: 'TRANSMISION', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 186, price: 223, stock: 0, minStock: 1 },
  { id: 2, code: '5025', oem: '922908530041 10865-BETTY 86122170 4345650 5101322 7112618 F44511002 5119389 IV013910 T111033483 5132097', name: 'EMPAQUE DE BALANCIN 6MM D229', category: 'MOTOR', brand: 'VALMET VALTRA', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 2.5, price: 3.2, stock: 0, minStock: 1 },
  { id: 3, code: '18329', oem: '18329-BETTY 18329 B250-BANDEIRANTES 18329', name: 'HORQUILLA ESTIRADO 26 - 30900 SERIE 2500', category: 'ENGANCHE Y ACC GENERAL', brand: 'UNIVERSAL', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 18.3, price: 38, stock: 0, minStock: 1 },
  { id: 4, code: '16438', oem: '16438-BETTY', name: 'MANCAL - COJINETE DE RASTRA A GRASA 1 1/4" 150MM BALD', category: 'ENGANCHE Y ACC GENERAL', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 72.9, price: 87.8, stock: 0, minStock: 1 },
  { id: 5, code: '15494', oem: '15494-BETTY VP91547 15494-QTP 81863331 15494/N3574B', name: 'RETEN PARA PALIER FORD 88X128X14.5/23', category: 'EJE TRASERO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 13.6, price: 16.3, stock: 0, minStock: 1 },
  { id: 6, code: '231', oem: '231-BETTY', name: 'ROTULA - CAT1 60X28X22.44MM IZQ Y DER - TERMINAL DE BRAZO d', category: 'ENGANCHE Y ACC GENERAL', brand: 'TODOS', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 19.42, price: 23.3, stock: 0, minStock: 1 },
  { id: 7, code: '62455', oem: '62455-QTP S.42535, 3440423, S.42535', name: 'ACOPLE DE DIRECCION Z12 Ø22MM LADO DENTADO / 19MM LADO LISO', category: 'TREN DELANTERO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 45.24, price: 124.8, stock: 0, minStock: 1 },
  { id: 8, code: '5028', oem: '5028-QTP S.71283, 571283, VPX4131, 6900731, 6900731M91, 6860558, 69010571, 68605571', name: 'EMPAQUE DE CULATA ZETOR', category: 'MOTOR', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 5.24, price: 14.3, stock: 0, minStock: 1 },
  { id: 9, code: '5077', oem: '5077', name: 'ANILLO DE TEFLON CELESTE PARA PISTON DE UH Ø90MM x 80MMx390', category: 'SISTEMA HIDRAULICO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MORELL POWER TRAIN', cost: 5, price: 9.2, stock: 0, minStock: 1 },
  { id: 10, code: '5026', oem: '5026-QTP S.42272, 342272, 312226-S, VPJ7625, 188831M92, 188831M93', name: 'CILINDRO MAESTRO DE EMBRAGUE 2 SALIDAS', category: 'TRANSMISION', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 58.24, price: 162, stock: 0, minStock: 1 },
  { id: 11, code: '5016', oem: '5016', name: 'MULTIPLE DE ESCAPE PARA MOTOR 4 CIL TURBO', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MORELL POWER TRAIN', cost: 156, price: 277, stock: 0, minStock: 1 },
  { id: 12, code: '5023', oem: '5023-GB 5163258', name: 'PALANCA DE LUCES MEDIA-BAJA-ALTA-DIRECCION-C/BOCINA FICHA DE 5', category: 'SISTEMA ELECTRICO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 72, price: 196.4, stock: 0, minStock: 1 },
  { id: 13, code: '5013', oem: '5013-GB 50062683 GB504062683', name: 'BULBO DE TEMPERATURA DE AGUA NH ROSCA Ø 16MM FICHA DE 2 PIN', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 32, price: 46.92, stock: 0, minStock: 1 },
  { id: 14, code: '4995', oem: '9962086-GB 9962086 - 4796474 4994093 5140244 5163940 5192578 5194262-QTP - GB9962086 DE 8 DISCOS 2681-QTP 5133287 5142861 GB5140243 87584056 87584066 86999159 46999159 367134 75287708 83925696', name: 'DISCO SEPARADOR Y DISCO DE FRICCION D/FRICCION D142 Z32 D140X90X2', category: 'TRANSMISION', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'GB - RICAMBI S.P.A', cost: 93, price: 256, stock: 0, minStock: 1 },
  { id: 15, code: '3981A', oem: '3981A-GB 5155336 4997213 5155336 4997213-GB5155336', name: 'GOMA DE FRENO CUADRADA VITON - GOMA DE FRENO L-420MM 263,8', category: 'FRENOS', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 25, price: 28, stock: 0, minStock: 2 },
  { id: 16, code: '1017', oem: '1017-M12 4997212 5185514 GB87388219', name: 'GOMA DE FRENO CUADRADA - GOMA DE FRENO L-330MM 233,8X2,4', category: 'FRENOS', brand: 'FIAT', unit: 'UNIDAD', supplier: 'MORELL POWER TRAIN', cost: 13, price: 15, stock: 98, minStock: 2 },
  { id: 17, code: '2930A', oem: '2930A-BETTY 3763024M1 84448700 7528-BETTY 520700M1 520700M2 520700M3 520700M5 520700M91 896912M1 1446182M1 1682688M1 1682689M1 886921M1', name: 'ENGRANAJE DE CAJA Z44 PRIMAVERA 6/8 VELOCIDADES MARCA EATON', category: 'TRANSMISION', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 100, price: 102, stock: 0, minStock: 1 },
  { id: 18, code: '5022', oem: '747741M1, 747742M1, 747743M1 64567-QTP', name: 'JGO DE PERNOS DE CULATA (22 UNI)', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 150, price: 155, stock: 1, minStock: 1 },
  { id: 19, code: '5006', oem: 'S.41641, S41641, 30/108-64, 1666817M91, 1679563M91, 1679563M92, 1666817M92, 1666817M1, 1882962-QTP 5006-QTP', name: 'CABLE ACELERADOR DE MANO L 1350MM', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 23, price: 25, stock: 3, minStock: 1 },
  { id: 20, code: '5000', oem: '5000-QTP S.43255, 39/105-6, VPJ3457, 1695712M1, 1695713M1 64711-QTP', name: 'TAPA DE TANQUE DIESEL CON LLAVE CON CADENA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 30, price: 38, stock: 2, minStock: 1 },
  { id: 21, code: '4999', oem: '4999-QTP S.43256, 39/105-5, VPX3459, 1695712M1, 3762001M1, 3697461M1 64710-QTP', name: 'TAPA DE TANQUE DIESEL SIN LLAVE CON CADENA Ø57MM', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 30, price: 38, stock: 2, minStock: 1 },
  { id: 22, code: '4998', oem: '4998-BETTY MF1752 6218189 / 80597578 / 80604300 / 9579378 / 6218189-BETTY', name: 'BARRA COMPLETA RECTA DER/IZQ L=472/442MM', category: 'TREN DELANTERO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 90, price: 188, stock: 3, minStock: 1 },
  { id: 23, code: '4997', oem: '4997-BETTY', name: 'DISCO DE RASTRA DENTADO 20" X 1/4"', category: 'ACCESORIOS / IM GENERAL', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 26.42, price: 32, stock: 18, minStock: 1 },
  { id: 24, code: '4996', oem: '4996-BETTY 8123', name: 'SENSOR DE FRENO - INTERRUPTOR DE LA LUZ DE FRENO', category: 'SISTEMA ELECTRICO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 28, price: 38, stock: 2, minStock: 1 },
  { id: 25, code: '4994', oem: 'E-3535-D6 VPH1507 880886M2 EM0035 880886M1 880886M91 783-BETTY 782-BETTY', name: 'ACOPLE LARGO DE CAJA CENTRAL Z10 - Ø43X52X127MM', category: 'TRANSMISION', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 35, price: 48, stock: 3, minStock: 1 },
  { id: 26, code: '4993', oem: 'E-3545-D985490 20175-BETTY 039543', name: 'EJE DE CAMBIO PRINCIPAL Z18/Z24 DE CAJA L295MM', category: 'TRANSMISION', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 271, price: 321, stock: 1, minStock: 1 },
  { id: 27, code: '1963A', oem: '1963A-CAP', name: 'JGO DE REPARO DE BOMBA HIDRAULICO GOMAS FORMA 3', category: 'SISTEMA HIDRAULICO', brand: 'FIAT', unit: 'JUEGO', supplier: 'CAPRONI ITALIAN', cost: 16, price: 17, stock: 28, minStock: 1 },
  { id: 28, code: '4992', oem: '0410132 731228M1 1447692M1 02139014 S.40015 340015 340015-B 3641821M1 3762535X1', name: 'ENGRANAJE DE CIGÜEÑAL Z25 Ø 38X80X24,5MM', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 52, price: 52, stock: 2, minStock: 1 },
  { id: 29, code: '4991', oem: '4991-CNH 5133589', name: 'GOMA - CAPUCHON INTERNO DE PALANCA REDONDO C/ 4 HUECOS', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'CNH-GB', cost: 3.07, price: 6.02, stock: 40, minStock: 2 },
  { id: 30, code: '0001', oem: '0001', name: 'OTROS', category: 'NINGUNO', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'GENERAL', cost: 1, price: 1, stock: 65, minStock: 1 },
  { id: 31, code: '006', oem: '006', name: 'TRABASIL', category: 'NINGUNO', brand: 'TODOS', unit: 'UNIDAD', supplier: 'N/A', cost: 1, price: 1, stock: 999, minStock: 0 },
  { id: 32, code: '006-SIL', oem: '006', name: 'PEGAMENTO SILICON', category: 'NINGUNO', brand: 'TODOS', unit: 'UNIDAD', supplier: 'N/A', cost: 1, price: 1, stock: 995, minStock: 0 },
  { id: 33, code: '4990', oem: 'S72991 s.72991 3145414R91 333 050 46 333 0050 460 3330050460 3599461M91 3610345M91 1893017M91 3610345M92 3610345M93 58209', name: 'DISCO DE EMBRAGUE 13" Z21 ORGANICO LUK', category: 'TRANSMISION', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 120, price: 140, stock: 3, minStock: 1 },
  { id: 34, code: '51-09415-000', oem: '51-09415-000', name: 'CAMISA HUMEDA 115MM X 225MM NORMAL/TURBO', category: 'MOTOR', brand: 'FIAT', unit: 'UNIDAD', supplier: 'YENIPARK - DEVO', cost: 43.7, price: 65, stock: 76, minStock: 80 },
  { id: 35, code: '4989', oem: 'S.65262, S65262, 24/100-49, 2641A065, 31325060, EIADKN9351N, BM2410049', name: 'BOMBIN DE DIESEL PARA DOS PERNOS PATA CORTA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 65, price: 78, stock: 2, minStock: 1 },
  { id: 36, code: '4988', oem: 'S.65259, 2641A057R, S646, 24/100-92, 68191005R, 7971560, BM84093350', name: 'BOMBIN DE COMBUSTIBLE PARA 2 PERNOS CON PLANCHA EN LA PATA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 75, price: 88, stock: 2, minStock: 1 },
  { id: 37, code: '4987', oem: 'AL 2624 S.42125 S42125 41115022 41115024 41115025 F3335M92 742843M1 31161371 41115086 41115098 41115108 41115021 41111008-QTP', name: 'ENGRANAJE LOCO DE BOMBA DE ACEITE Z21 15X61.4X16', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 40, price: 44.5, stock: 6, minStock: 1 },
  { id: 38, code: '4984', oem: '0714471EX 07144111', name: 'INTERRUPTOR DE LUZ 2 TIEMPOS 3 CONECTORES P/FAROL DE TRABAJO', category: 'SISTEMA ELECTRICO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'INDISA / TVH BRA', cost: 27.97, price: 49.11, stock: 10, minStock: 5 },
  { id: 39, code: '4983', oem: '042000MTEX 042000MTEX', name: 'INTERRUPTOR DE LUZ 2 TIEMPOS DE 9 CONECTORES P/FAROL DE TRABAJO', category: 'SISTEMA ELECTRICO', brand: 'TODOS', unit: 'UNIDAD', supplier: 'INDISA / TVH BRA', cost: 14.64, price: 25.76, stock: 10, minStock: 5 },
  { id: 40, code: '4982', oem: '042100MTEX 042100MTEX', name: 'INTERRUPTOR DE LUZ DE 2 TIEMPOS RECTANGULAR LUZ ALTA/LUZ BAJA', category: 'SISTEMA ELECTRICO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'INDISA / TVH BRA', cost: 34.37, price: 60.25, stock: 9, minStock: 5 },
  { id: 41, code: '4981', oem: '0627835EX 0627835I', name: 'RELOJ INDICADOR DE COMBUSTIBLE', category: 'SISTEMA ELECTRICO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'INDISA / TVH BRA', cost: 16.28, price: 28.58, stock: 14, minStock: 5 },
  { id: 42, code: '4980', oem: '0627829EX 0627829I', name: 'RELOJ DE TEMPERATURA', category: 'SISTEMA ELECTRICO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'INDISA / TVH BRA', cost: 25, price: 43.03, stock: 30, minStock: 2 },
  { id: 43, code: '4985', oem: '4985-BETTY 86401594 FH171 56240053241 TH225 Bosch 0450132018 Mahle HX54 Mann 56240053241 Wix 51478', name: 'FILTRO HIDRAULICO PARA TRANSMISION VALMET 32,5X72X113,5 MM', category: 'FILTROS', brand: 'VALMET VALTRA', unit: 'UNIDAD', supplier: 'BETTY VALLE GRANDE', cost: 15, price: 36, stock: 5, minStock: 1 },
  { id: 44, code: '262650', oem: '262650-TVH6310', name: 'TAPA DE PLASTICO DE ACEITE DE MOTOR', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'TVH DELLAROSA', cost: 4, price: 15, stock: 0, minStock: 4 },
  { id: 45, code: '4962', oem: '1221468 83230M1 022199T1 036401 MF 1860475 1860475M1 OEM 240 250 265 275 290 375 390 425 440 460 475 4215 4370', name: 'RODAMIENTO AGUJAS BLINDADO DE PTO TIPO CANASTILLO 53X60X25', category: 'EJE TRASERO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'TVH DELLAROSA', cost: 11.78, price: 25.68, stock: 56, minStock: 5 },
  { id: 46, code: '4963', oem: '4963', name: 'TERCER PUNTO BRAZO TERCER PUNTO L-645MM-890MM ROSCA M30X2', category: 'ACCESORIOS / IM GENERAL', brand: 'TODOS', unit: 'UNIDAD', supplier: 'TUZZI', cost: 57.44, price: 91.9, stock: 20, minStock: 5 },
  { id: 47, code: '4281A', oem: '4281A-TVH 80173000 80173000G 033615 47000602 BT10160 819349/10 AL819349/10 0750117062 84566037 5136951 83237100 CAR045181 4T-CR1012 7248 31565-BETTY NW89059 5.7254 85136951 85806002 1666269C1', name: 'RODAMIENTO CONICO DE CUBO 4x4 Ø 59X135X21 2F 54.99X28.14.81X10', category: 'TREN DELANTERO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'TVH DELLAROSA', cost: 35.84, price: 62.53, stock: 19, minStock: 3 },
  { id: 48, code: '4979', oem: '4979-TVH 1481532 020454T1', name: 'TERMINAL DE DIRECCION / MUÑON DE DIRECCION BARRA LARGA MF', category: 'TREN DELANTERO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'TVH DELLAROSA', cost: 22.82, price: 40.87, stock: 48, minStock: 4 },
  { id: 49, code: '4969', oem: '4969-TVH 062333SC', name: 'JUEGO DE REPARO CILINDRO DE DIRECCION 4X4 CARRARO 20.16 MF', category: 'TREN DELANTERO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'TVH DELLAROSA', cost: 11.42, price: 25.06, stock: 50, minStock: 5 },
  { id: 50, code: '4968', oem: 'AN11724/013', name: 'JUEGO DE COJINETE DE BANCADA 0.10 MOTOR NEF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'SMY SAHIM', cost: 32, price: 36, stock: 30, minStock: 4 },
  { id: 51, code: '4967', oem: 'AN11724/023', name: 'JUEGO DE COJINETE DE BANCADA 0.20 MOTOR NEF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'SMY SAHIM', cost: 30, price: 32, stock: 30, minStock: 4 },
  { id: 52, code: '4966', oem: 'AN11724/019', name: 'JUEGO DE COJINETE DE BANCADA 0.10 MOTOR NEF (SAHIM)', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'SAHIM-SMY', cost: 30, price: 32, stock: 24, minStock: 2 },
  { id: 53, code: '4965', oem: 'AN11725/017', name: 'JUEGO COJINETE DE BIELA 0.10 MOTOR NEF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'SMY SAHIM', cost: 32, price: 35, stock: 30, minStock: 4 },
  { id: 54, code: '4961', oem: '4961-C140 C366 75211 1901385 R1515987 5139101 5139100 5177700 12016050 12016050B 4997542', name: 'RETEN DE PALIER DELANTERO 42X62X21.5 CORTECO ALEMAN', category: 'TREN DELANTERO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'CORTECO / QTP', cost: 10.3, price: 17.96, stock: 80, minStock: 10 },
  { id: 55, code: '4977', oem: '4977-MEC 211480', name: 'ENGRANAJE DE BOMBA DE ACEITE CIGÜEÑAL Z43 MARCA CNH', category: 'MOTOR', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'MEC DIESEL OMP', cost: 21.75, price: 133, stock: 3, minStock: 2 },
  { id: 56, code: '4976', oem: '4976-MEC 2830972 2831297', name: 'PERNO DE BIELA MOTOR NEF F4GE0484/0684 M10X52', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MEC DIESEL OMP', cost: 1.17, price: 12.3, stock: 18, minStock: 4 },
  { id: 57, code: '4975', oem: '8425124 2995784 2995786 2992147', name: 'JUEGO DE COJINETE DE BANCADA 050/020 MOTOR NEF MOTOR 4 CIL', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'JUEGO', supplier: 'MEC DIESEL OMP', cost: 55.44, price: 90.68, stock: 2, minStock: 1 },
  { id: 58, code: '4974', oem: '504250394 500086379 2992146 810390 2992154', name: 'JGO DE AXIALES 025/010 MOTOR NEFF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'OMP MEC DIESEL', cost: 20.89, price: 39.45, stock: 9, minStock: 5 },
  { id: 59, code: '4973', oem: '2995780 500086095 2995784 2992153 810310', name: 'JGO DE AXIALES STD MOTOR NEFF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MEC DIESEL OMP', cost: 21.75, price: 34.8, stock: 10, minStock: 4 },
  { id: 60, code: '4972', oem: '566520 4895361 504065159 F4be/F4ge0484/0684', name: 'VARILLA DE BALANCIN / VARILLA DE EMPUJE MOTOR NEFF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MEC DIESEL OMP', cost: 2.98, price: 15.48, stock: 30, minStock: 4 },
  { id: 61, code: '4971', oem: '2830913 2830912 2830911 49310', name: 'BOMBA DE ACEITE MOTOR NEFF 4-6 CIL', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'MEC DIESEL OMP', cost: 200.58, price: 349.5, stock: 4, minStock: 2 },
  { id: 62, code: '4970', oem: '504081209 504053522 504110669 700 848980', name: 'EMPAQUE DE GOMA TAPA DE BALANCIN 6 CILINDRO MOTOR NEF', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'KOLBENSCHMIDT', cost: 4.55, price: 7.92, stock: 30, minStock: 5 },
  { id: 63, code: '3742', oem: '3742-TUZZI D-82590272 TP02881230', name: 'TERCER PUNTO AMBOS LADOS AGARRADOR LARGO CERRADO 625MM', category: 'ENGANCHE Y ACC GENERAL', brand: 'TODOS', unit: 'UNIDAD', supplier: 'TUZZI', cost: 137, price: 283, stock: 8, minStock: 1 },
  { id: 64, code: '3741', oem: '82590272 - DKN0276A - DKN99768A', name: 'TERCER PUNTO CAT 2 A 2 BRAZO U TUERCA 3 PUNTA LARGO CERRADO', category: 'ACCESORIOS / IM GENERAL', brand: 'TODOS', unit: 'UNIDAD', supplier: 'TUZZI', cost: 97, price: 97, stock: 10, minStock: 1 },
  { id: 65, code: '4968-ARG', oem: '4968 Fiat 4522467', name: 'PULSADOR DE ARRANQUE - ESTANCO ARGENTINO', category: 'SISTEMA ELECTRICO', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GENERAL', cost: 50, price: 55, stock: 20, minStock: 1 },
  { id: 66, code: '5002', oem: '5002', name: 'SERVICIO DE ENVIO / TRANSPORTE EXTERNO', category: 'NINGUNO', brand: 'GENERAL', unit: 'N/A', supplier: 'GENERAL', cost: 1, price: 2, stock: 1992, minStock: 20 },
  { id: 67, code: '4964', oem: '504096115 4812012', name: 'ENGRANAJE DE DISTRIBUCION Z57 31,6x22x35x39,6', category: 'MOTOR', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 680, price: 687, stock: 1, minStock: 1 },
  { id: 68, code: '4966-GB', oem: '4966-GB5149127', name: 'ARANDELA DE TRANSMISION GRUESA Z24 46x72x7x6,5', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 171, price: 171, stock: 10, minStock: 1 },
  { id: 69, code: '4965-GB', oem: '4965-GB5149129', name: 'ARANDELA DE TRANSMISION DELGADA Z24 46x72x5x5', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 143, price: 143, stock: 10, minStock: 1 },
  { id: 70, code: '401182', oem: '401182-QTP 4994093 5142861 GB5006073 5106073', name: 'RETEN DE EJE DE CAJA 20X38X7', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 5, price: 13, stock: 1, minStock: 1 },
  { id: 71, code: '4985-GB', oem: 'GB4985057 4985057', name: 'BUJE DE CAJA 28X33X18', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 13, price: 14, stock: 10, minStock: 1 },
  { id: 72, code: '4964-GB', oem: 'GB5161736 5161736', name: 'SEGURO DE CAJA MEDIA LUNA', category: 'TRANSMISION', brand: 'FIAT', unit: 'JUEGO', supplier: 'GB - RICAMBI S.P.A', cost: 98, price: 99, stock: 1, minStock: 1 },
  { id: 73, code: '5142309', oem: 'GB5152539 5152539', name: 'PATIN DE HORQUILLA - ALMOHADILLA DESLIZANTE - 35 mm largo x 12 mm', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 90, price: 91, stock: 1, minStock: 1 },
  { id: 74, code: '4961-GB', oem: 'GB5138459 5138459', name: 'TUERCA ANULAR M45x1.5 MM - TUERCA DE EJE DE CAJA 43,5-65-17MM', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 55, price: 62, stock: 2, minStock: 1 },
  { id: 75, code: '4959', oem: '4959-QTP', name: 'DESTELLADOR A MEDIANO FIAT/MF/NH/JD', category: 'SISTEMA ELECTRICO', brand: 'GENERAL', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 50, price: 58, stock: 2, minStock: 1 },
  { id: 76, code: '4958', oem: '4958-QTP 82005066, 24/1912-88', name: 'STOP TRASERO IZQUIERDO / DERECHO', category: 'SISTEMA ELECTRICO', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 113, price: 121, stock: 4, minStock: 1 },
  { id: 77, code: '6462', oem: '6462-QTP S.70598, S70598, 29/1922-32, 495-61, VPJ3961, 3764927M2, 3764927M91, 3764928M2, 3875328, MF0904', name: 'EXTREMO DE BARRA DE DIRECCION CILINDRO PASO LARGO 220MM', category: 'TREN DELANTERO', brand: 'MASSEY FERGUSON', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 70, price: 72, stock: 2, minStock: 1 },
  { id: 78, code: '4960', oem: '5167408 GB5167408', name: 'GUARDAPOLVO DE PALANCA DE CAJA RECTANGULAR HUECOS - palanca', category: 'CABINA / CHAPA', brand: 'NEW HOLLAND', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 25, price: 26, stock: 59, minStock: 2 },
  { id: 79, code: '4957', oem: '5145308 GB5145308', name: 'ANILLA DE CAJA 69.8MM ID x 75mm OD x 3mm 70x75x3', category: 'TRANSMISION', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 100, price: 183, stock: 3, minStock: 1 },
  { id: 80, code: '4956', oem: '87300540', name: 'PASADOR DE REDUCTOR DELANTERO 10.3/11 X 56MM', category: 'TREN DELANTERO', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 25, price: 27, stock: 6, minStock: 1 },
  { id: 81, code: '4955', oem: '5133842', name: 'TUERCA DE PIÑON DELANTERO M45X 1.5', category: 'TREN DELANTERO', brand: 'FIAT', unit: 'UNIDAD', supplier: 'GB - RICAMBI S.P.A', cost: 22, price: 23, stock: 23, minStock: 1 },
  { id: 82, code: '2319-LED', oem: '2319-LED-QTP 23/183-24, VPM2539, 5122379, 5126508, 5120072, 5120073, 5138349, 82991246', name: 'FAROL CUADRADO PARA MASCARA DELANTERA FIAT TIPO LED', category: 'SISTEMA ELECTRICO', brand: 'FIAT', unit: 'UNIDAD', supplier: 'QTP - QUALITY TRACTOR PARTS', cost: 210, price: 236, stock: 4, minStock: 1 },
  { id: 83, code: '4949', oem: '1104D-E44T EMMARK EM2802-010 MF 4226999M91 Perkins U5MB0038A U5MB0038C Caterpillar 233-3784', name: 'COJINETE DE BANCADA 010 PERKINS 1104 EMMARK 4347', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 13.33, price: 58, stock: 25, minStock: 5 },
  { id: 84, code: '4950', oem: 'EMMARK 4348 MF 3400/5400/6400 4227000M91 4225061M91 Caterpillar 353-7425 233-3785 Perkins U5MB0038B U5MB0033B VPC3037', name: 'COJINETE DE BANCADA 020 PERKINS 1104 EMMARK', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 13.33, price: 58, stock: 25, minStock: 5 },
  { id: 85, code: '4951', oem: 'EM7250 EMMARK 4236 MF 3050 3060 5425-5460 6445-6470 Caterpillar 233-3784 348-0196 177-8752 Perkins U5MB0038A U5MB0033A T427333 4226999M91 4225059M91', name: 'COJINETE DE BANCADA STD PERKINS 1104 EMMARK', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 13.33, price: 58, stock: 25, minStock: 4 },
  { id: 86, code: '4952', oem: 'EM4693 PERKINS T420153 MF 4227410M1 EM18074-010 EM18074010-BETTY 56315-BETTY T4109270', name: 'JUEGO DE COJINETE DE BIELA 010 MOTOR 1104C - COJINETE DE BIELA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 13.43, price: 22.06, stock: 20, minStock: 5 },
  { id: 87, code: '4953', oem: 'PERKINS T420154 MF 4227411M1 EM18074-020 422741M1 50672-BETTY T4109273', name: 'JUEGO DE COJINETE DE BIELA 020 MOTOR 1104C - COJINETE DE BIELA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 13.43, price: 22, stock: 20, minStock: 5 },
  { id: 88, code: '4954', oem: 'PERKINS T420155 MF 5455 5465 EM18074-030 4227412M1 T4109272', name: 'JUEGO DE COJINETE DE BIELA 030 MOTOR 1104C - COJINETE DE BIELA', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 12.74, price: 20.38, stock: 20, minStock: 5 },
  { id: 89, code: '4949-STD', oem: 'MF 5445 Caterpillar 360-3986 Perkins U5ME0033 7846 T410927 T400002 EM18074 MF 4227200M1', name: 'JUEGO DE COJINETE BIELA STD 1104C COMPATIBLES CON CIGÜEÑALES', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 12.74, price: 20.95, stock: 20, minStock: 5 },
  { id: 90, code: '4948', oem: 'EM9578 MF 1104 Series 1104D-44 1104D-44TA 1104C-44T T411357 U5MK0986 MF 4226454M91', name: 'JGO. DE ANILLA 105MM STD 2.7X2.5X3.00 PERKINS 1104', category: 'MOTOR', brand: 'MASSEY FERGUSON', unit: 'JUEGO', supplier: 'EMMARK BETTY', cost: 11.37, price: 18.68, stock: 80, minStock: 10 },
  { id: 91, code: 'EM9532', oem: 'EM9532 Fiat 450 466 480 500 540 600 640 670 680 980 1000 Fiat 8770770 4775035 1901348', name: 'PISTON + ANILLA 100MM Ø P=38MM EMMARK', category: 'MOTOR', brand: 'FIAT', unit: 'UNIDAD', supplier: 'EMMARK BETTY', cost: 55.27, price: 95, stock: 51, minStock: 0 },
];

function splitBranchStock(stock: number): Record<string, number> {
  if (stock <= 0) {
    return { 'Sucursal Central': 0, 'Sucursal Norte': 0, 'Sucursal Sur': 0 };
  }
  const central = Math.ceil(stock * 0.7);
  const norte = stock - central;
  return {
    'Sucursal Central': central,
    'Sucursal Norte': norte,
    'Sucursal Sur': 0,
  };
}

export const TRACTOR_PARTS_PRODUCTS: (Product & { active?: number })[] = RAW_PARTS.map((r) => ({
  id: r.id,
  name: r.name,
  description: `Repuesto ${r.brand} · Cat: ${r.category} · Prov: ${r.supplier} · OEM: ${r.oem}`,
  price: r.price,
  cost_price: r.cost,
  stock: r.stock,
  min_stock: r.minStock,
  branch_stocks: splitBranchStock(r.stock),
  category: r.category,
  brand: r.brand,
  oem_codes: r.oem,
  supplier_name: r.supplier,
  barcode: r.code,
  batch_number: r.supplier,
  expiry_date: '2030-12-31',
  unit_type: r.unit,
  is_combo: 0,
  active: 1,
}));
