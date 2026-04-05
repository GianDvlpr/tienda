'use client';

import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme, App } from 'antd';
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
                    colorPrimary: '#C89F53',
                    colorBgBase: isDarkMode ? '#1A1A1A' : '#FAF9F6',
                    fontFamily: 'var(--font-montserrat), sans-serif',
                    borderRadius: 4,
                },
                components: {
                    Button: {
                        borderRadius: 2,
                        controlHeightLG: 48,
                        fontWeight: 600,
                    },
                    Card: {
                        borderRadiusLG: 0,
                    }
                }
            }}
        >

            <App>
                {children}
            </App>
        </ConfigProvider>
    );
}
