'use client';

import React from 'react';
import { Flex, Skeleton } from 'antd';

export default function ShopFiltersSkeleton() {
    return (
        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Skeleton.Button active size="large" style={{ width: 40 }} />
            <Skeleton.Input active size="large" style={{ width: 200 }} />
        </Flex>
    );
}