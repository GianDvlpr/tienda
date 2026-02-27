'use client';

import React from 'react';
import { Card, Divider, Flex, Skeleton } from 'antd';

export default function ShopFiltersSkeleton() {
    return (
        <Card>
            <Flex gap={16} wrap="wrap" align="flex-start">
                <div style={{ minWidth: 220 }}>
                    <Skeleton.Input active style={{ width: 220, height: 32 }} />
                </div>

                <div style={{ minWidth: 260, flex: 1 }}>
                    <Skeleton.Input active style={{ width: '100%', height: 32 }} />
                </div>

                <div style={{ minWidth: 260 }}>
                    <Skeleton.Input active style={{ width: 260, height: 32 }} />
                </div>

                <div style={{ minWidth: 220 }}>
                    <Skeleton.Input active style={{ width: 120, height: 32 }} />
                </div>
            </Flex>

            <Divider />

            <Flex gap={24} wrap="wrap" align="flex-start">
                <div style={{ minWidth: 320 }}>
                    <Skeleton.Input active style={{ width: 320, height: 32 }} />
                    <div style={{ marginTop: 12 }}>
                        <Skeleton active paragraph={{ rows: 1 }} title={false} />
                    </div>
                </div>

                <div style={{ minWidth: 260 }}>
                    <Skeleton active title={{ width: 120 }} paragraph={{ rows: 3 }} />
                </div>

                <div style={{ minWidth: 260 }}>
                    <Skeleton active title={{ width: 120 }} paragraph={{ rows: 3 }} />
                </div>
            </Flex>
        </Card>
    );
}