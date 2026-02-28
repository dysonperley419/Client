import { createContext, useContext } from 'react';

import type { useVoice } from '@/hooks/useVoice';

export const VoiceContext = createContext<ReturnType<typeof useVoice> | null>(null);

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoiceContext must be used within VoiceProvider');
  return context;
};
