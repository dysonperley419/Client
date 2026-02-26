import React, { createContext, useContext, useMemo } from 'react';

const ConfigContext = createContext<{ cdnUrl: string | null }>(null!);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const cdnUrl = useMemo(() => localStorage.getItem('selectedCdnUrl'), []);

    return (
        <ConfigContext.Provider value={{ cdnUrl }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => useContext(ConfigContext);