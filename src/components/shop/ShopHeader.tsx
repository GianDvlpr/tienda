"use client";

import { Layout, Badge, Button, Switch, Space, Input } from "antd";
import { ShoppingOutlined, BulbOutlined, BulbFilled, MenuOutlined, SearchOutlined, CloseOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart.store";
import { useThemeStore } from "@/store/theme.store";
import { useUIStore } from "@/store/ui.store";
import MiniCart from "./MiniCart";

import AuraLogo from "@/components/AuraLogo";

const { Header } = Layout;

export default function ShopHeader() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const inputRef = useRef<any>(null);

    const totalItems = useCartStore((s) => s.totalItems());
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);
    const toggleFilterDrawer = useUIStore((s) => s.toggleFilterDrawer);
    const isSearchOpen = useUIStore((s) => s.isSearchOpen);
    const setSearchOpen = useUIStore((s) => s.setSearchOpen);
    const toggleSearch = useUIStore((s) => s.toggleSearch);

    const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

    useEffect(() => {
        setSearchValue(searchParams.get("q") ?? "");
    }, [searchParams]);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearch = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set("q", value);
        } else {
            params.delete("q");
        }
        params.set("page", "1");
        router.push(`/shop?${params.toString()}`);
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <Header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: scrolled ? "rgba(0,0,0,0.9)" : "transparent",
                    transition: "background 0.3s ease",
                    position: "fixed",
                    width: "100%",
                    zIndex: 1000,
                    height: 80, // slightly taller to fit the logo
                    borderBottom: scrolled ? "1px solid rgba(255,255,255,0.1)" : "none",
                }}
            >
                {/* Left section: Navigation / Search */}
                <Space size="middle" style={{ flex: 1, color: "white" }}>
                    {!isSearchOpen && (
                        <>
                            <Button 
                                type="text" 
                                icon={<MenuOutlined style={{ fontSize: 20, color: 'white' }} />} 
                                onClick={() => toggleFilterDrawer()}
                                style={{ color: 'white', display: 'flex', alignItems: 'center' }}
                            >
                                <span style={{ marginLeft: 8, fontWeight: 500, letterSpacing: 1 }}>Menú</span>
                            </Button>
                            <Button 
                                type="text" 
                                icon={<SearchOutlined style={{ fontSize: 20, color: 'white' }} />} 
                                onClick={() => toggleSearch()}
                                style={{ color: 'white', display: 'flex', alignItems: 'center' }}
                            >
                                <span style={{ marginLeft: 8, fontWeight: 500, letterSpacing: 1 }}>Buscar</span>
                            </Button>
                        </>
                    )}
                    {isSearchOpen && (
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 400 }}>
                            <Input
                                ref={inputRef}
                                placeholder="Buscar en la tienda..."
                                variant="borderless"
                                prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
                                suffix={
                                    <CloseOutlined 
                                        onClick={() => {
                                            setSearchOpen(false);
                                            setSearchValue("");
                                            handleSearch("");
                                        }} 
                                        style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }} 
                                    />
                                }
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onPressEnter={() => handleSearch(searchValue)}
                                style={{ 
                                    color: 'white', 
                                    borderBottom: '1px solid rgba(255,255,255,0.3)',
                                    padding: '4px 0'
                                }}
                            />
                        </div>
                    )}
                </Space>

                {/* Center section: Logo */}
                <Link
                    href="/shop"
                    style={{
                        textDecoration: "none",
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <AuraLogo size="default" />
                </Link>

                {/* Right section: User actions */}
                <Space size="middle" style={{ flex: 1, justifyContent: "flex-end", color: "white" }}>
                    <Switch
                        checked={isDarkMode}
                        onChange={toggleDarkMode}
                        checkedChildren={<BulbFilled />}
                        unCheckedChildren={<BulbOutlined />}
                    />
                    <Badge count={totalItems} size="small" overflowCount={99}>
                        <Button
                            type="text"
                            icon={<ShoppingOutlined style={{ fontSize: 20, color: 'white' }} />}
                            onClick={() => setOpen(true)}
                            style={{ color: 'white' }}
                        />
                    </Badge>
                </Space>
            </Header>

            <MiniCart open={open} onClose={() => setOpen(false)} />
        </>
    );
}