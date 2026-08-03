import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { getPublicLinkPage } from '@/lib/link-page';
import styles from './links.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Links Oficiales | Aura Boutique',
    description: 'Accede al catalogo, redes sociales, contacto y anuncios oficiales de Aura Boutique.',
    openGraph: {
        title: 'Aura Boutique | Links Oficiales',
        description: 'Catalogo, redes sociales, contacto y novedades de Aura Boutique.',
        url: 'https://auraboutique.me/links',
    },
};

const typeLabels: Record<string, string> = {
    CATALOG: 'CAT',
    WHATSAPP: 'WA',
    INSTAGRAM: 'IG',
    FACEBOOK: 'FB',
    TIKTOK: 'TT',
    EMAIL: 'MAIL',
    ANNOUNCEMENT: 'NEW',
    CUSTOM: 'LINK',
};

const themeClasses: Record<string, string> = {
    BOUTIQUE: styles.themeBoutique,
    DARK_GOLD: styles.themeDarkGold,
    ROSE: styles.themeRose,
    MINIMAL: styles.themeMinimal,
    CAMPAIGN: styles.themeCampaign,
};

function isExternalUrl(url: string) {
    return /^(https?:|mailto:|tel:)/i.test(url);
}

function renderIcon(imageUrl: string | null, label: string, className: string) {
    if (!imageUrl) return null;

    return (
        <span className={className}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={label} />
        </span>
    );
}

function DefaultTypeIcon({ type }: { type: string }) {
    const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    if (type === 'WHATSAPP') {
        return <svg {...common}><path d="M20 11.5a8 8 0 0 1-11.9 7l-4.1 1.1 1.1-4A8 8 0 1 1 20 11.5Z" /><path d="M9 8.8c.2 3 2.2 5 5.2 5.2l1.1-1.1" /></svg>;
    }

    if (type === 'INSTAGRAM') {
        return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.4" /><path d="M16.8 7.2h.01" /></svg>;
    }

    if (type === 'FACEBOOK') {
        return <svg {...common}><path d="M14 8h2V4h-2a5 5 0 0 0-5 5v3H7v4h2v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>;
    }

    if (type === 'TIKTOK') {
        return <svg {...common}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.7 2.7 2.2 4.2 5 4.6" /></svg>;
    }

    if (type === 'EMAIL') {
        return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m4 8 8 5 8-5" /></svg>;
    }

    if (type === 'CATALOG') {
        return <svg {...common}><path d="M6 5h12v14H6z" /><path d="M9 9h6" /><path d="M9 13h4" /></svg>;
    }

    if (type === 'ANNOUNCEMENT') {
        return <svg {...common}><path d="M5 14h3l8 4V6l-8 4H5z" /><path d="M19 9a4 4 0 0 1 0 6" /></svg>;
    }

    return <svg {...common}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>;
}

export default async function LinksPage() {
    const { settings, items } = await getPublicLinkPage();
    const activeAnnouncement = settings.is_announcement_active && settings.announcement;
    const pageStyle: CSSProperties = {
        ...(settings.background_color ? { backgroundColor: settings.background_color } : {}),
        ...(settings.background_image_url ? { backgroundImage: `linear-gradient(rgba(20, 16, 14, 0.2), rgba(20, 16, 14, 0.2)), url(${settings.background_image_url})` } : {}),
    };
    const pageClassName = [
        styles.page,
        themeClasses[settings.theme] ?? styles.themeBoutique,
        settings.enable_animations ? styles.withAnimations : '',
    ].filter(Boolean).join(' ');

    return (
        <main className={pageClassName} style={pageStyle}>
            <div className={styles.glowTop} />
            <section className={styles.card} aria-label="Links oficiales de Aura Boutique">
                <div className={styles.brandBlock}>
                    <div className={styles.avatarWrap}>
                        {settings.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={styles.avatarImage} src={settings.avatar_url} alt={settings.title} />
                        ) : (
                            <div className={styles.avatarFallback} aria-hidden="true">
                                <span>{settings.logo_text}</span>
                            </div>
                        )}
                    </div>
                    <p className={styles.kicker}>{settings.eyebrow_text}</p>
                    <h1>{settings.title}</h1>
                    {settings.subtitle && <p className={styles.subtitle}>{settings.subtitle}</p>}
                </div>

                {activeAnnouncement && (
                    settings.announcement_url ? (
                        <a
                            className={styles.announcement}
                            href={settings.announcement_url}
                            target={isExternalUrl(settings.announcement_url) ? '_blank' : undefined}
                            rel={isExternalUrl(settings.announcement_url) ? 'noreferrer' : undefined}
                        >
                            {renderIcon(settings.announcement_logo_url, 'Logo del anuncio', styles.announcementLogo)}
                            <span className={styles.announcementText}>
                                <small>Anuncio</small>
                                <strong>{settings.announcement}</strong>
                            </span>
                        </a>
                    ) : (
                        <div className={styles.announcement}>
                            {renderIcon(settings.announcement_logo_url, 'Logo del anuncio', styles.announcementLogo)}
                            <span className={styles.announcementText}>
                                <small>Anuncio</small>
                                <strong>{settings.announcement}</strong>
                            </span>
                        </div>
                    )
                )}

                <div className={styles.linksList}>
                    {items.length > 0 ? items.map((item) => {
                        const external = isExternalUrl(item.url);

                        return (
                            <a
                                key={item.link_id}
                                className={`${styles.linkItem} ${item.is_featured ? styles.featuredLink : ''} ${item.featured_image_url ? styles.bannerLink : ''}`}
                                href={item.url}
                                target={external ? '_blank' : undefined}
                                rel={external ? 'noreferrer' : undefined}
                                style={{
                                    ...(item.background_color ? { background: item.background_color } : {}),
                                    ...(item.text_color ? { color: item.text_color } : {}),
                                }}
                            >
                                {item.is_featured && item.featured_image_url && (
                                    <span className={styles.featuredImage}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.featured_image_url} alt="" />
                                    </span>
                                )}
                                {item.icon_url ? (
                                    <span className={styles.linkIcon}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.icon_url} alt={item.title} />
                                    </span>
                                ) : (
                                    <span className={styles.linkType} aria-label={typeLabels[item.link_type] ?? 'LINK'}>
                                        <DefaultTypeIcon type={item.link_type} />
                                    </span>
                                )}
                                <span className={styles.linkText}>
                                    <strong>{item.title}</strong>
                                    {item.description && <small>{item.description}</small>}
                                </span>
                                <span className={styles.linkArrow}>Abrir</span>
                            </a>
                        );
                    }) : (
                        <div className={styles.emptyState}>
                            <strong>Contenido no disponible</strong>
                            <span>Vuelve pronto para ver nuestros enlaces oficiales.</span>
                        </div>
                    )}
                </div>

                <footer className={styles.footer}>
                    <span>{settings.footer_text}</span>
                    <a href="/shop">Ir al catalogo</a>
                </footer>
            </section>
        </main>
    );
}
