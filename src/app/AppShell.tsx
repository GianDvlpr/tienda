"use client";

import { Layout } from "antd";
import ShopHeader from "@/components/shop/ShopHeader";

const { Content, Footer } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <Layout style={{ minHeight: "100vh" }}>
            <ShopHeader />

            <Content style={{ width: "100%", margin: 0, padding: 0 }}>
                {children}
            </Content>

            <Footer style={{ textAlign: "center" }}>
                © {new Date().getFullYear()} AURA
            </Footer>
        </Layout>
    );
}