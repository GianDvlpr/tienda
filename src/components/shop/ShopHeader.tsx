"use client";

import { Layout, Badge, Button, Switch, Space, Input, Grid } from "antd";
import { HeartOutlined, BulbOutlined, BulbFilled, MenuOutlined, SearchOutlined, CloseOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useThemeStore } from "@/store/theme.store";
import { useUIStore } from "@/store/ui.store";
import MiniCart from "./MiniCart";
import WishlistDrawer from "./WishlistDrawer";

import AuraLogo from "@/components/AuraLogo";

const { Header } = Layout;

export default function ShopHeader() {
    const [openCart, setOpenCart] = useState(false);
    const [openWishlist, setOpenWishlist] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const inputRef = useRef<any>(null);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    const totalCartItems = useCartStore((s) => s.totalItems());
    const totalWishlistItems = useWishlistStore((s) => s.totalItems());
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
                    height: isMobile ? 64 : 80, // slightly taller to fit the logo
                    borderBottom: scrolled ? "1px solid rgba(255,255,255,0.1)" : "none",
                    padding: isMobile ? "0 12px" : "0 24px",
                }}
            >
                {/* Left section: Navigation / Search */}
                <Space size={isMobile ? "small" : "middle"} style={{ flex: 1, color: "white" }}>
                    {!isSearchOpen && (
                        <>

                            <Button 
                                type="text" 
                                icon={<SearchOutlined style={{ fontSize: isMobile ? 18 : 20, color: 'white' }} />} 
                                onClick={() => toggleSearch()}
                                style={{ color: 'white', display: 'flex', alignItems: 'center', padding: isMobile ? "0 4px" : "4px 15px" }}
                            >
                                {!isMobile && <span style={{ marginLeft: 8, fontWeight: 500, letterSpacing: 1 }}>Buscar</span>}
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
                    <AuraLogo size={isMobile ? "small" : "default"} />
                </Link>

                {/* Right section: User actions */}
                <Space size={isMobile ? "small" : "middle"} style={{ flex: 1, justifyContent: "flex-end", color: "white" }}>
                    {!isMobile && (
                        <Switch
                            checked={isDarkMode}
                            onChange={toggleDarkMode}
                            checkedChildren={<BulbFilled />}
                            unCheckedChildren={<BulbOutlined />}
                        />
                    )}
                    <Space size={16}>
                        <Badge count={totalWishlistItems} size="small" overflowCount={99}>
                            <Button
                                type="text"
                                icon={<HeartOutlined style={{ fontSize: isMobile ? 18 : 20, color: 'white' }} />}
                                onClick={() => setOpenWishlist(true)}
                                title="Favoritos"
                                style={{ color: 'white', padding: isMobile ? "0 4px" : "4px 8px" }}
                            />
                        </Badge>
                        <Badge count={totalCartItems} size="small" overflowCount={99}>
                            <Button
                                type="text"
                                icon={<ShoppingCartOutlined style={{ fontSize: isMobile ? 18 : 20, color: 'white' }} />}
                                onClick={() => setOpenCart(true)}
                                title="Mi Carrito"
                                style={{ color: 'white', padding: isMobile ? "0 4px" : "4px 8px" }}
                            />
                        </Badge>
                    </Space>
                </Space>
            </Header>

            <MiniCart open={openCart} onClose={() => setOpenCart(false)} />
            <WishlistDrawer open={openWishlist} onClose={() => setOpenWishlist(false)} />
        </>
    );
}