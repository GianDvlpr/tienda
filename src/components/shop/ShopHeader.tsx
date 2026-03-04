"use client";

import { Layout, Badge, Button, Switch, Space } from "antd";
import { ShoppingOutlined, BulbOutlined, BulbFilled } from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/store/cart.store";
import { useThemeStore } from "@/store/theme.store";
import MiniCart from "./MiniCart";

const { Header } = Layout;

export default function ShopHeader() {
    const [open, setOpen] = useState(false);
    const totalItems = useCartStore((s) => s.totalItems());
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);

    return (
        <>
            <Header
                style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#000",
                }}
            >
                <Link
                    href="/shop"
                    style={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 18,
                        marginRight: 32,
                        textDecoration: "none",
                    }}
                >
                    AURA
                </Link>



                <Space size="middle" style={{ marginLeft: "auto" }}>
                    <Switch
                        checked={isDarkMode}
                        onChange={toggleDarkMode}
                        checkedChildren={<BulbFilled />}
                        unCheckedChildren={<BulbOutlined />}
                    />
                    <Badge count={totalItems} size="small" overflowCount={99}>
                        <Button
                            icon={<ShoppingOutlined />}
                            onClick={() => setOpen(true)}
                        >
                            Carrito
                        </Button>
                    </Badge>
                </Space>
            </Header>

            <MiniCart open={open} onClose={() => setOpen(false)} />
        </>
    );
}