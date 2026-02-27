"use client";

import { Layout, Menu, Badge, Button } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/store/cart.store";
import MiniCart from "./MiniCart";

const { Header } = Layout;

export default function ShopHeader() {
    const [open, setOpen] = useState(false);
    const totalItems = useCartStore((s) => s.totalItems());

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

                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={["shop"]}
                    items={[
                        {
                            key: "shop",
                            label: <Link href="/shop">Tienda</Link>,
                        },
                    ]}
                    style={{ flex: 1, minWidth: 0 }}
                />

                <Badge count={totalItems} size="small" overflowCount={99}>
                    <Button
                        icon={<ShoppingOutlined />}
                        onClick={() => setOpen(true)}
                    >
                        Carrito
                    </Button>
                </Badge>
            </Header>

            <MiniCart open={open} onClose={() => setOpen(false)} />
        </>
    );
}