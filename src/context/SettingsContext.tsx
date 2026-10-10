import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Settings Context - Manages regional settings like currency and price formatting.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const LATAM_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  { code: 'CRC', symbol: '₡', name: 'Colón Costarricense' },
  { code: 'CUP', symbol: '$', name: 'Peso Cubano' },
  { code: 'DOP', symbol: '$', name: 'Peso Dominicano' },
  { code: 'SVC', symbol: '$', name: 'Colón Salvadoreño' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal Guatemalteco' },
  { code: 'HNL', symbol: 'L', name: 'Lempira Hondureño' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'NIO', symbol: 'C$', name: 'Córdoba Nicaragüense' },
  { code: 'PAB', symbol: 'B/.', name: 'Balboa Panameño' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní Paraguayo' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  { code: 'UYU', symbol: '$', name: 'Peso Uruguayo' },
  { code: 'VES', symbol: 'Bs.S', name: 'Bolívar Soberano' },
];

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(LATAM_CURRENCIES.find(c => c.code === 'BOB') || LATAM_CURRENCIES[0]);

  useEffect(() => {
    const savedCurrency = localStorage.getItem('app_currency');
    if (savedCurrency) {
      try {
        const parsed = JSON.parse(savedCurrency);
        setCurrencyState(parsed);
      } catch (e) {
        console.error('Failed to parse saved currency', e);
      }
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('app_currency', JSON.stringify(newCurrency));
  };

  const formatPrice = (price: number) => {
    return `${currency.symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SettingsContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
