import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AccountContextType {
  googleAdsAccountIds: string[];
  selectedGoogleAdsAccountId: string[];
  microsoftAdsAccountIds: string[];
  selectedMicrosoftAdsAccountId: string[];
  targetFocus: 'conversion' | 'value';
  conversionTarget: string;
  cpaTarget: string;
  conversionValueTarget: string;
  roasTarget: string;
  clientName: string;
  setGoogleAdsAccountIds: (ids: string[]) => void;
  setSelectedGoogleAdsAccountId: (ids: string[]) => void;
  setMicrosoftAdsAccountIds: (ids: string[]) => void;
  setSelectedMicrosoftAdsAccountId: (ids: string[]) => void;
  setTargetFocus: (focus: 'conversion' | 'value') => void;
  setConversionTarget: (target: string) => void;
  setCpaTarget: (target: string) => void;
  setConversionValueTarget: (target: string) => void;
  setRoasTarget: (target: string) => void;
  setClientName: (name: string) => void;
  loading: boolean;
}

export const AccountContext = createContext<AccountContextType>({
  googleAdsAccountIds: [],
  selectedGoogleAdsAccountId: [],
  microsoftAdsAccountIds: [],
  selectedMicrosoftAdsAccountId: [],
  targetFocus: 'conversion',
  conversionTarget: '',
  cpaTarget: '',
  conversionValueTarget: '',
  roasTarget: '',
  clientName: '',
  setGoogleAdsAccountIds: () => {},
  setSelectedGoogleAdsAccountId: () => {},
  setMicrosoftAdsAccountIds: () => {},
  setSelectedMicrosoftAdsAccountId: () => {},
  setTargetFocus: () => {},
  setConversionTarget: () => {},
  setCpaTarget: () => {},
  setConversionValueTarget: () => {},
  setRoasTarget: () => {},
  setClientName: () => {},
  loading: true,
});

export const useAccount = () => useContext(AccountContext);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleAdsAccountIds, setGoogleAdsAccountIds] = useState<string[]>([]);
  const [selectedGoogleAdsAccountId, setSelectedGoogleAdsAccountId] = useState<string[]>([]);
  const [microsoftAdsAccountIds, setMicrosoftAdsAccountIds] = useState<string[]>([]);
  const [selectedMicrosoftAdsAccountId, setSelectedMicrosoftAdsAccountId] = useState<string[]>([]);
  const [targetFocus, setTargetFocus] = useState<'conversion' | 'value'>('conversion');
  const [conversionTarget, setConversionTarget] = useState<string>('');
  const [cpaTarget, setCpaTarget] = useState<string>('');
  const [conversionValueTarget, setConversionValueTarget] = useState<string>('');
  const [roasTarget, setRoasTarget] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { status } = useSession();

  const fetchSettings = async () => {
    try {
      console.log('Fetching settings...');
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched settings:', data);
        setGoogleAdsAccountIds(data.googleAdsAccountIds || []);
        setSelectedGoogleAdsAccountId(data.selectedGoogleAdsAccountId || []);
        setMicrosoftAdsAccountIds(data.microsoftAdsAccountIds || []);
        setSelectedMicrosoftAdsAccountId(data.selectedMicrosoftAdsAccountId || []);
        setTargetFocus(data.targetFocus || 'conversion');
        setConversionTarget(data.conversionTarget?.toString() || '');
        setCpaTarget(data.cpaTarget?.toString() || '');
        setConversionValueTarget(data.conversionValueTarget?.toString() || '');
        setRoasTarget(data.roasTarget?.toString() || '');
        setClientName(data.clientName || '');
      } else {
        console.error('Settings fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings only when session is authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  return (
    <AccountContext.Provider
      value={{
        googleAdsAccountIds,
        setGoogleAdsAccountIds,
        selectedGoogleAdsAccountId,
        setSelectedGoogleAdsAccountId,
        microsoftAdsAccountIds,
        setMicrosoftAdsAccountIds,
        selectedMicrosoftAdsAccountId,
        setSelectedMicrosoftAdsAccountId,
        targetFocus,
        setTargetFocus,
        conversionTarget,
        setConversionTarget,
        cpaTarget,
        setCpaTarget,
        conversionValueTarget,
        setConversionValueTarget,
        roasTarget,
        setRoasTarget,
        clientName,
        setClientName,
        loading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}; 