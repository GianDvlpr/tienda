'use client';

import React from 'react';
import { ConfigProvider, theme } from 'antd';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    borderRadius: 10,
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}