"use client";

import { Layout } from "antd";
import ShopHeader from "@/components/shop/ShopHeader";
import { usePathname } from "next/navigation";

const { Content, Footer } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');

    return (
        <Layout style={{ minHeight: "100vh" }}>
            {!isAdmin && <ShopHeader />}

            <Content style={{ width: "100%", margin: 0, padding: 0 }}>
                {children}
            </Content>

            {!isAdmin && (
                <Footer style={{ textAlign: "center" }}>
                    © {new Date().getFullYear()} AURA
                </Footer>
            )}
        </Layout>
    );
}