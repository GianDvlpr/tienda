"use client";

import { Layout } from "antd";
import { Suspense } from "react";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFooter from "@/components/shop/ShopFooter";
import QuickViewDrawer from "@/components/shop/QuickViewDrawer";
import { usePathname } from "next/navigation";

const { Content } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');
    const isTrack = pathname.startsWith('/track');

    const showPublicShell = !isAdmin && !isTrack;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            {showPublicShell && (
                <>
                    <Suspense fallback={<div style={{ height: 80 }} />}>
                        <ShopHeader />
                    </Suspense>
                    <QuickViewDrawer />
                </>
            )}

            <Content style={{ width: "100%", margin: 0, padding: 0 }}>
                {children}
            </Content>

            {showPublicShell && <ShopFooter />}
        </Layout>
    );
}