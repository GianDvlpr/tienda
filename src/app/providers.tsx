'use client';

import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useThemeStore } from '@/store/theme.store';

export default function Providers({ children }: { children: React.ReactNode }) {
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ visibility: 'hidden' }}>{children}</div>;
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    borderRadius: 10,
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}
