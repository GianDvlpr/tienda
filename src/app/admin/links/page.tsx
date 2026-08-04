'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button, Card, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, Row, Col, theme } from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';

const { Title, Text } = Typography;
const { TextArea } = Input;

const linkTypeOptions = [
    { label: 'Catalogo', value: 'CATALOG' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Instagram', value: 'INSTAGRAM' },
    { label: 'Facebook', value: 'FACEBOOK' },
    { label: 'TikTok', value: 'TIKTOK' },
    { label: 'Correo', value: 'EMAIL' },
    { label: 'Anuncio', value: 'ANNOUNCEMENT' },
    { label: 'Personalizado', value: 'CUSTOM' },
];

const themeOptions = [
    { label: 'Boutique claro', value: 'BOUTIQUE' },
    { label: 'Negro/dorado premium', value: 'DARK_GOLD' },
    { label: 'Rosa/nude elegante', value: 'ROSE' },
    { label: 'Minimal blanco', value: 'MINIMAL' },
    { label: 'Campana especial', value: 'CAMPAIGN' },
];

const buttonStyleOptions = [
    { label: 'Redondeado suave', value: 'ROUNDED' },
    { label: 'Pill ovalado', value: 'PILL' },
    { label: 'Rectangular editorial', value: 'EDITORIAL' },
    { label: 'Glass transparente', value: 'GLASS' },
    { label: 'Solido premium', value: 'SOLID' },
];

const statusOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Proximamente', value: 'COMING_SOON' },
    { label: 'Agotado', value: 'SOLD_OUT' },
    { label: 'No disponible', value: 'DISABLED' },
];

const seasonalPresets = [
    { label: 'San Valentin', value: 'VALENTINE', theme: 'ROSE', button_style: 'PILL', background_color: '#fff4f2', announcement: 'Especial de San Valentin' },
    { label: 'Navidad', value: 'CHRISTMAS', theme: 'DARK_GOLD', button_style: 'SOLID', background_color: '#120f0d', announcement: 'Coleccion de temporada navidena' },
    { label: 'Black Friday', value: 'BLACK_FRIDAY', theme: 'DARK_GOLD', button_style: 'EDITORIAL', background_color: '#050505', announcement: 'Ofertas por tiempo limitado' },
    { label: 'Verano', value: 'SUMMER', theme: 'BOUTIQUE', button_style: 'ROUNDED', background_color: '#f8efe5', announcement: 'Nueva coleccion de verano' },
    { label: 'Lanzamiento', value: 'LAUNCH', theme: 'CAMPAIGN', button_style: 'GLASS', background_color: '#28120d', announcement: 'Nuevo lanzamiento disponible' },
];

const previewThemeStyles: Record<string, { page: React.CSSProperties; card: React.CSSProperties; accent: string; button: React.CSSProperties; text: string; muted: string }> = {
    BOUTIQUE: {
        page: { background: 'linear-gradient(145deg, #f8efe5, #fdf9f2 48%, #efe0cc)', color: '#211a16' },
        card: { background: 'rgba(255,252,247,0.82)', borderColor: 'rgba(255,255,255,0.72)' },
        accent: '#c89f53',
        button: { background: 'rgba(255,255,255,0.78)', color: '#211a16' },
        text: '#211a16',
        muted: 'rgba(33,26,22,0.64)',
    },
    DARK_GOLD: {
        page: { background: 'linear-gradient(145deg, #0e0c0b, #211711 55%, #060504)', color: '#fff7e8' },
        card: { background: 'rgba(18,15,13,0.84)', borderColor: 'rgba(200,159,83,0.28)' },
        accent: '#d9b56b',
        button: { background: 'rgba(255,247,232,0.1)', color: '#fff7e8' },
        text: '#fff7e8',
        muted: 'rgba(255,247,232,0.64)',
    },
    ROSE: {
        page: { background: 'linear-gradient(145deg, #fff4f2, #f8dfe1 55%, #eac9bc)', color: '#3b2228' },
        card: { background: 'rgba(255,249,250,0.84)', borderColor: 'rgba(255,255,255,0.78)' },
        accent: '#c9858e',
        button: { background: 'rgba(255,255,255,0.76)', color: '#3b2228' },
        text: '#3b2228',
        muted: 'rgba(59,34,40,0.64)',
    },
    MINIMAL: {
        page: { background: 'linear-gradient(145deg, #ffffff, #f6f6f6)', color: '#111111' },
        card: { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(17,17,17,0.08)' },
        accent: '#111111',
        button: { background: '#ffffff', color: '#111111' },
        text: '#111111',
        muted: 'rgba(17,17,17,0.58)',
    },
    CAMPAIGN: {
        page: { background: 'linear-gradient(145deg, #28120d, #7c2b1b 52%, #1a0d09)', color: '#fffdf7' },
        card: { background: 'rgba(34,17,11,0.74)', borderColor: 'rgba(255,253,247,0.2)' },
        accent: '#ffcf5a',
        button: { background: 'rgba(255,253,247,0.14)', color: '#fffdf7' },
        text: '#fffdf7',
        muted: 'rgba(255,253,247,0.66)',
    },
};

type LinkPageSettings = {
    settings_key: string;
    title: string;
    logo_text: string;
    eyebrow_text: string;
    theme: string;
    button_style: string;
    background_image_url: string | null;
    background_color: string | null;
    enable_animations: boolean;
    og_title: string | null;
    og_description: string | null;
    og_image_url: string | null;
    subtitle: string | null;
    avatar_url: string | null;
    announcement: string | null;
    announcement_url: string | null;
    announcement_logo_url: string | null;
    is_announcement_active: boolean;
    is_active: boolean;
    footer_text: string;
};

type LinkItem = {
    link_id: string;
    title: string;
    description: string | null;
    url: string;
    icon_url: string | null;
    featured_image_url: string | null;
    background_color: string | null;
    text_color: string | null;
    badge_text: string | null;
    link_type: string;
    availability_status: string;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
};

type LinkPageSettingsForm = Omit<LinkPageSettings, 'settings_key'>;
type LinkItemForm = Omit<LinkItem, 'link_id'>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

async function readApiError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    return data?.error || fallback;
}

export default function AdminLinksPage() {
    const { token } = theme.useToken();
    const { data: settings, error: settingsError, mutate: mutateSettings, isLoading: loadingSettings } = useSWR<LinkPageSettings>('/api/admin/links/settings', fetcher);
    const { data: items, error: itemsError, mutate: mutateItems, isLoading: loadingItems } = useSWR<LinkItem[]>('/api/admin/links/items', fetcher);

    const [settingsForm] = Form.useForm<LinkPageSettingsForm>();
    const [itemForm] = Form.useForm<LinkItemForm>();
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>();
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
    const [featuredFilter, setFeaturedFilter] = useState<boolean | undefined>();
    const [availabilityFilter, setAvailabilityFilter] = useState<string>();
    const watchedSettings = Form.useWatch([], settingsForm) as Partial<LinkPageSettingsForm> | undefined;
    const linksUrl = 'https://auraboutique.me/links';
    const pdfUrl = 'https://auraboutique.me/catalogo.pdf';

    const filteredItems = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (items || []).filter((item) => {
            const matchesSearch = !normalizedSearch
                || item.title.toLowerCase().includes(normalizedSearch)
                || item.url.toLowerCase().includes(normalizedSearch)
                || String(item.description || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (typeFilter && item.link_type !== typeFilter) return false;
            if (activeFilter !== undefined && item.is_active !== activeFilter) return false;
            if (featuredFilter !== undefined && item.is_featured !== featuredFilter) return false;
            if (availabilityFilter && item.availability_status !== availabilityFilter) return false;

            return true;
        });
    }, [items, search, typeFilter, activeFilter, featuredFilter, availabilityFilter]);

    const hasActiveFilters = Boolean(search || typeFilter || activeFilter !== undefined || featuredFilter !== undefined || availabilityFilter);

    const clearFilters = () => {
        setSearch('');
        setTypeFilter(undefined);
        setActiveFilter(undefined);
        setFeaturedFilter(undefined);
        setAvailabilityFilter(undefined);
    };

    const previewSettings: LinkPageSettingsForm = {
        title: 'Aura Boutique',
        logo_text: 'Aura',
        eyebrow_text: 'Links oficiales',
        theme: 'BOUTIQUE',
        button_style: 'ROUNDED',
        background_image_url: null,
        background_color: null,
        enable_animations: true,
        og_title: null,
        og_description: null,
        og_image_url: null,
        subtitle: null,
        avatar_url: null,
        announcement: null,
        announcement_url: null,
        announcement_logo_url: null,
        is_announcement_active: true,
        is_active: true,
        footer_text: 'Aura Boutique',
        ...(settings ? { ...settings } : {}),
        ...(watchedSettings ? { ...watchedSettings } : {}),
    };
    const previewTheme = previewThemeStyles[previewSettings.theme] ?? previewThemeStyles.BOUTIQUE;
    const previewItems = (items ?? []).filter((item) => item.is_active).slice(0, 4);

    useEffect(() => {
        if (!settings) return;
        settingsForm.setFieldsValue(settings);
    }, [settings, settingsForm]);

    const handleSaveSettings = async (values: LinkPageSettingsForm) => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/admin/links/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error guardando configuracion'));
            }

            toast.success('Configuracion de links actualizada');
            mutateSettings();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setSavingSettings(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        itemForm.resetFields();
        itemForm.setFieldsValue({
            link_type: 'CUSTOM',
            availability_status: 'ACTIVE',
            sort_order: (items?.length ?? 0) * 10 + 10,
            is_featured: false,
            is_active: true,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: LinkItem) => {
        setEditingItem(record);
        itemForm.resetFields();
        itemForm.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (linkId: string) => {
        try {
            const res = await fetch(`/api/admin/links/items/${linkId}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error eliminando enlace'));
            }

            toast.success('Enlace eliminado');
            mutateItems();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        }
    };

    const handleSaveItem = async (values: LinkItemForm) => {
        setSavingItem(true);
        try {
            const isUpdate = !!editingItem;
            const url = isUpdate ? `/api/admin/links/items/${editingItem.link_id}` : '/api/admin/links/items';
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error guardando enlace'));
            }

            toast.success(`Enlace ${isUpdate ? 'actualizado' : 'creado'} correctamente`);
            setIsModalOpen(false);
            mutateItems();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setSavingItem(false);
        }
    };

    const handleAvatarUpload = (url: string) => {
        settingsForm.setFieldValue('avatar_url', url);
        toast.success('Logo principal subido correctamente');
    };

    const handleAnnouncementLogoUpload = (url: string) => {
        settingsForm.setFieldValue('announcement_logo_url', url);
        toast.success('Logo del anuncio subido correctamente');
    };

    const handleBackgroundUpload = (url: string) => {
        settingsForm.setFieldValue('background_image_url', url);
        toast.success('Fondo subido correctamente');
    };

    const handleItemLogoUpload = (url: string) => {
        itemForm.setFieldValue('icon_url', url);
        toast.success('Logo del enlace subido correctamente');
    };

    const handleFeaturedImageUpload = (url: string) => {
        itemForm.setFieldValue('featured_image_url', url);
        toast.success('Banner destacado subido correctamente');
    };

    const handleOgImageUpload = (url: string) => {
        settingsForm.setFieldValue('og_image_url', url);
        toast.success('Imagen para compartir subida correctamente');
    };

    const useLogoAsOgImage = () => {
        const avatarUrl = settingsForm.getFieldValue('avatar_url');
        if (!avatarUrl) {
            toast.error('Primero configura o sube un logo principal');
            return;
        }
        settingsForm.setFieldValue('og_image_url', avatarUrl);
        toast.success('Logo principal configurado como imagen para compartir');
    };

    const applySeasonalPreset = (presetValue: string) => {
        const preset = seasonalPresets.find((item) => item.value === presetValue);
        if (!preset) return;

        settingsForm.setFieldsValue({
            theme: preset.theme,
            button_style: preset.button_style,
            background_color: preset.background_color,
            announcement: preset.announcement,
            is_announcement_active: true,
            enable_animations: true,
        });
        toast.success(`Preset aplicado: ${preset.label}`);
    };

    const getQrUrl = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url)}`;

    const handleReorder = async (targetId: string) => {
        if (!draggingId || draggingId === targetId || !items) return;

        const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
        const fromIndex = ordered.findIndex((item) => item.link_id === draggingId);
        const toIndex = ordered.findIndex((item) => item.link_id === targetId);
        if (fromIndex < 0 || toIndex < 0) return;

        const [moved] = ordered.splice(fromIndex, 1);
        ordered.splice(toIndex, 0, moved);

        try {
            await Promise.all(ordered.map((item, index) => {
                const sortOrder = (index + 1) * 10;
                if (item.sort_order === sortOrder) return Promise.resolve();

                return fetch(`/api/admin/links/items/${item.link_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...item, sort_order: sortOrder }),
                }).then(async (res) => {
                    if (!res.ok) throw new Error(await readApiError(res, 'Error actualizando orden'));
                });
            }));
            toast.success('Orden actualizado');
            mutateItems();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setDraggingId(null);
        }
    };

    const columns: TableColumnsType<LinkItem> = [
        {
            title: '',
            key: 'drag',
            width: 44,
            render: () => <Text type="secondary" style={{ cursor: 'grab', fontSize: 18 }}>::</Text>,
        },
        {
            title: 'Logo',
            dataIndex: 'icon_url',
            key: 'icon_url',
            width: 80,
            render: (url: string | null, record: LinkItem) => url ? (
                <Image src={url} alt={record.title} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 12 }} />
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: 'Enlace',
            key: 'title',
            render: (_value: unknown, record: LinkItem) => (
                <Space direction="vertical" size={0}>
                    <strong>{record.title}</strong>
                    {record.description && <Text type="secondary">{record.description}</Text>}
                </Space>
            ),
        },
        {
            title: 'Tipo',
            dataIndex: 'link_type',
            key: 'link_type',
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            ellipsis: true,
            render: (url: string) => <Text copyable={{ text: url }} type="secondary">{url}</Text>,
        },
        {
            title: 'Colores',
            key: 'colors',
            width: 110,
            render: (_value: unknown, record: LinkItem) => (
                <Space>
                    {record.background_color && <span title="Fondo" style={{ width: 18, height: 18, borderRadius: 6, background: record.background_color, border: '1px solid #ddd', display: 'inline-block' }} />}
                    {record.text_color && <span title="Texto" style={{ width: 18, height: 18, borderRadius: 6, background: record.text_color, border: '1px solid #ddd', display: 'inline-block' }} />}
                    {!record.background_color && !record.text_color && <Text type="secondary">-</Text>}
                </Space>
            ),
        },
        {
            title: 'Orden',
            dataIndex: 'sort_order',
            key: 'sort_order',
            width: 90,
        },
        {
            title: 'Estado',
            key: 'state',
            render: (_value: unknown, record: LinkItem) => (
                <Space wrap>
                    <Tag color={record.is_active ? 'green' : 'red'}>{record.is_active ? 'Visible' : 'Oculto'}</Tag>
                    {record.is_featured && <Tag color="gold">{record.badge_text || 'Destacado'}</Tag>}
                </Space>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_value: unknown, record: LinkItem) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="¿Eliminar enlace?"
                        onConfirm={() => handleDelete(record.link_id)}
                        okText="Si, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (settingsError) return <div>Error cargando configuracion: {settingsError.message}</div>;
    if (itemsError) return <div>Error cargando enlaces: {itemsError.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Pagina de Links</Title>
                <Space>
                    <Button href="/links" target="_blank">Ver /links</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Nuevo Enlace</Button>
                </Space>
            </div>

            <Card title="Perfil y anuncio" loading={loadingSettings} style={{ marginBottom: 24 }}>
                <Form layout="vertical" form={settingsForm} onFinish={handleSaveSettings}>
                    <Form.Item label="Preset de temporada">
                        <Select
                            placeholder="Aplicar preset rapido"
                            options={seasonalPresets.map((preset) => ({ label: preset.label, value: preset.value }))}
                            onChange={applySeasonalPreset}
                            allowClear
                        />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="title" label="Titulo" rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="Aura Boutique" />
                        </Form.Item>

                        <Form.Item name="theme" label="Tema visual">
                            <Select options={themeOptions} />
                        </Form.Item>

                        <Form.Item name="button_style" label="Estilo de botones">
                            <Select options={buttonStyleOptions} />
                        </Form.Item>

                        <Form.Item name="logo_text" label="Texto del logo si no hay imagen">
                            <Input placeholder="Aura" />
                        </Form.Item>

                        <Form.Item name="eyebrow_text" label="Texto superior pequeno">
                            <Input placeholder="Links oficiales" />
                        </Form.Item>

                        <Form.Item name="subtitle" label="Subtitulo">
                            <Input placeholder="Moda femenina exclusiva..." />
                        </Form.Item>
                        
                        <Form.Item name="avatar_url" label="URL del logo principal">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo principal">
                            <ImageUploader onUploadSuccess={handleAvatarUpload} buttonText="Subir Logo" />
                        </Form.Item>

                        <Form.Item name="background_image_url" label="URL de imagen de fondo">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir imagen de fondo">
                            <ImageUploader onUploadSuccess={handleBackgroundUpload} buttonText="Subir Fondo" />
                        </Form.Item>

                        <Form.Item name="background_color" label="Color de fondo">
                            <Input type="color" />
                        </Form.Item>
                    </div>

                    <Card size="small" title="Open Graph para compartir" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                            <Form.Item name="og_title" label="Titulo al compartir">
                                <Input placeholder="Aura Boutique | Links Oficiales" />
                            </Form.Item>

                            <Form.Item name="og_description" label="Descripcion al compartir">
                                <Input placeholder="Catalogo, redes y contacto oficial" />
                            </Form.Item>

                            <Form.Item name="og_image_url" label="URL imagen al compartir">
                                <Input placeholder="https://..." />
                            </Form.Item>

                            <Form.Item label="Imagen para compartir">
                                <Space.Compact style={{ width: '100%' }}>
                                    <ImageUploader onUploadSuccess={handleOgImageUpload} buttonText="Subir Imagen" />
                                    <Button onClick={useLogoAsOgImage}>Usar logo</Button>
                                </Space.Compact>
                            </Form.Item>
                        </div>
                    </Card>

                    <Form.Item name="footer_text" label="Texto del pie de la pagina">
                        <Input placeholder="Aura Boutique" />
                    </Form.Item>

                    <Form.Item name="announcement" label="Anuncio superior">
                        <TextArea rows={2} placeholder="Ej. Nueva coleccion disponible" />
                    </Form.Item>

                    <Form.Item name="announcement_url" label="URL del anuncio">
                        <Input placeholder="/shop o https://..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="announcement_logo_url" label="URL del logo del anuncio">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo del anuncio">
                            <ImageUploader onUploadSuccess={handleAnnouncementLogoUpload} buttonText="Subir Logo" />
                        </Form.Item>
                    </div>

                    <Space size="large" wrap>
                        <Form.Item name="is_active" label="Pagina publica" valuePropName="checked">
                            <Switch checkedChildren="Activa" unCheckedChildren="Oculta" />
                        </Form.Item>

                        <Form.Item name="is_announcement_active" label="Mostrar anuncio" valuePropName="checked">
                            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
                        </Form.Item>

                        <Form.Item name="enable_animations" label="Animaciones" valuePropName="checked">
                            <Switch checkedChildren="Activas" unCheckedChildren="Sin animacion" />
                        </Form.Item>
                    </Space>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button type="primary" htmlType="submit" loading={savingSettings}>Guardar Configuracion</Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card title="Links" style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                    <Row gutter={[12, 12]} align="bottom">
                        <Col xs={24} md={6}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, URL o descripción" allowClear />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Tipo</Text>
                            <Select allowClear value={typeFilter} onChange={setTypeFilter} placeholder="Todos" style={{ width: '100%' }} options={linkTypeOptions} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Visible</Text>
                            <Select allowClear value={activeFilter} onChange={setActiveFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Visible' }, { value: false, label: 'Oculto' }]} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Destacado</Text>
                            <Select allowClear value={featuredFilter} onChange={setFeaturedFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Disponibilidad</Text>
                            <Select allowClear value={availabilityFilter} onChange={setAvailabilityFilter} placeholder="Todas" style={{ width: '100%' }} options={statusOptions} />
                        </Col>
                        <Col xs={24} md={2}>
                            <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                        Mostrando {filteredItems.length} de {items?.length || 0} enlaces
                    </Text>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredItems}
                    loading={loadingItems}
                    rowKey="link_id"
                    pagination={false}
                    onRow={(record) => ({
                        draggable: true,
                        onDragStart: () => setDraggingId(record.link_id),
                        onDragOver: (event) => event.preventDefault(),
                        onDrop: () => handleReorder(record.link_id),
                    })}
                />
            </Card>

            <Card title="Vista previa" style={{ marginBottom: 24 }}>
                <div style={{ ...previewTheme.page, ...(previewSettings.background_color ? { background: previewSettings.background_color } : {}), ...(previewSettings.background_image_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${previewSettings.background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}), borderRadius: 24, padding: 18 }}>
                    <div style={{ ...previewTheme.card, maxWidth: 360, margin: '0 auto', border: '1px solid', borderRadius: 24, padding: 18, boxShadow: '0 18px 40px rgba(0,0,0,0.16)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 14 }}>
                            <div style={{ width: 72, height: 72, margin: '0 auto 10px', borderRadius: 999, padding: 3, background: previewTheme.accent }}>
                                {previewSettings.avatar_url ? (
                                    <Image src={previewSettings.avatar_url} alt="Logo" preview={false} width={66} height={66} style={{ objectFit: 'cover', borderRadius: 999 }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', borderRadius: 999, background: '#16120f', color: previewTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-alex-brush)', fontSize: 24 }}>
                                        {previewSettings.logo_text}
                                    </div>
                                )}
                            </div>
                            <div style={{ color: previewTheme.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{previewSettings.eyebrow_text}</div>
                            <div style={{ color: previewTheme.text, fontFamily: 'var(--font-playfair)', fontSize: 28, lineHeight: 1.05 }}>{previewSettings.title}</div>
                            {previewSettings.subtitle && <div style={{ color: previewTheme.muted, fontSize: 12, marginTop: 6 }}>{previewSettings.subtitle}</div>}
                        </div>

                        {previewSettings.is_announcement_active && previewSettings.announcement && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12, marginBottom: 10, color: '#fff', background: 'linear-gradient(135deg, #1c1713, #6a4528)' }}>
                                {previewSettings.announcement_logo_url && <Image src={previewSettings.announcement_logo_url} alt="Anuncio" preview={false} width={34} height={34} style={{ objectFit: 'cover', borderRadius: 10 }} />}
                                <div>
                                    <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.72 }}>Anuncio</div>
                                    <strong style={{ fontSize: 12 }}>{previewSettings.announcement}</strong>
                                </div>
                            </div>
                        )}

                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {previewItems.map((item) => (
                                <div key={item.link_id} style={{ ...previewTheme.button, ...(item.background_color ? { background: item.background_color } : {}), ...(item.text_color ? { color: item.text_color } : {}), minHeight: item.is_featured && item.featured_image_url ? 92 : 56, position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {item.is_featured && item.featured_image_url && <Image src={item.featured_image_url} alt="" preview={false} width="100%" height={92} style={{ position: 'absolute', inset: 0, objectFit: 'cover', filter: 'brightness(0.62)' }} />}
                                    {item.is_featured && <span style={{ position: 'absolute', zIndex: 2, top: 8, right: 8, borderRadius: 999, padding: '3px 8px', color: '#23170e', background: previewTheme.accent, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.badge_text || 'Destacado'}</span>}
                                    <span style={{ position: 'relative', zIndex: 1, width: 34, height: 34, borderRadius: 10, background: previewTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 34px' }}>
                                        {item.icon_url ? <Image src={item.icon_url} alt="" preview={false} width={34} height={34} style={{ objectFit: 'cover' }} /> : <Text style={{ color: '#111', fontSize: 10, fontWeight: 800 }}>{item.link_type.slice(0, 2)}</Text>}
                                    </span>
                                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ color: item.is_featured && item.featured_image_url ? '#fff' : 'inherit', lineHeight: 1.1 }}>{item.title}</strong>
                                        {item.description && <small style={{ color: item.is_featured && item.featured_image_url ? 'rgba(255,255,255,0.76)' : previewTheme.muted }}>{item.description}</small>}
                                    </span>
                                </div>
                            ))}
                        </Space>
                    </div>
                </div>
            </Card>

            <Card title="QR visual" style={{ marginBottom: 24 }}>
                <Space size="large" wrap>
                    <Space direction="vertical" align="center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getQrUrl(linksUrl)} alt="QR de links" width={160} height={160} style={{ borderRadius: 16, border: '1px solid #eee', padding: 8, background: '#fff' }} />
                        <Text strong>/links</Text>
                        <Text copyable={{ text: linksUrl }} type="secondary">{linksUrl}</Text>
                    </Space>
                    <Space direction="vertical" align="center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getQrUrl(pdfUrl)} alt="QR de catalogo PDF" width={160} height={160} style={{ borderRadius: 16, border: '1px solid #eee', padding: 8, background: '#fff' }} />
                        <Text strong>Catalogo PDF</Text>
                        <Text copyable={{ text: pdfUrl }} type="secondary">{pdfUrl}</Text>
                    </Space>
                </Space>
            </Card>

            <Modal
                title={editingItem ? 'Editar Enlace' : 'Nuevo Enlace'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
                forceRender
            >
                <Form layout="vertical" form={itemForm} onFinish={handleSaveItem} style={{ marginTop: 24 }}>
                    <Form.Item name="title" label="Titulo" rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="Ver catalogo" />
                    </Form.Item>

                    <Form.Item name="description" label="Descripcion">
                        <TextArea rows={2} placeholder="Texto corto opcional" />
                    </Form.Item>

                    <Form.Item name="badge_text" label="Etiqueta destacada">
                        <Input placeholder="Nuevo, Promo, Mas pedido..." maxLength={40} />
                    </Form.Item>

                    <Form.Item name="url" label="URL" rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="/shop, https://instagram.com/... o mailto:hola@..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="icon_url" label="URL del logo del enlace">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo del enlace">
                            <ImageUploader onUploadSuccess={handleItemLogoUpload} buttonText="Subir Logo" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="featured_image_url" label="URL del banner destacado">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir banner destacado">
                            <ImageUploader onUploadSuccess={handleFeaturedImageUpload} buttonText="Subir Banner" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="background_color" label="Color del boton">
                            <Input type="color" />
                        </Form.Item>

                        <Form.Item name="text_color" label="Color del texto">
                            <Input type="color" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="link_type" label="Tipo">
                            <Select options={linkTypeOptions} />
                        </Form.Item>

                        <Form.Item name="availability_status" label="Estado visual">
                            <Select options={statusOptions} />
                        </Form.Item>

                        <Form.Item name="sort_order" label="Orden">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <Space size="large" wrap>
                        <Form.Item name="is_active" label="Estado" valuePropName="checked">
                            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
                        </Form.Item>

                        <Form.Item name="is_featured" label="Destacado" valuePropName="checked">
                            <Switch checkedChildren="Si" unCheckedChildren="No" />
                        </Form.Item>
                    </Space>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={savingItem}>Guardar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
