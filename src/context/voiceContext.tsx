import React, { createContext, useContext } from 'react';

import { useVoice } from '@/hooks/useVoice';

const VoiceContext = createContext<ReturnType<typeof useVoice> | null>(null);

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  const voice = useVoice();

  return <VoiceContext.Provider value={voice}>{children}</VoiceContext.Provider>;
};

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoiceContext must be used within VoiceProvider');
  return context;
};
