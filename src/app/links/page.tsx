import type { Metadata } from 'next';
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

export default async function LinksPage() {
    const { settings, items } = await getPublicLinkPage();
    const activeAnnouncement = settings.is_announcement_active && settings.announcement;

    return (
        <main className={styles.page}>
            <div className={styles.glowTop} />
            <section className={styles.card} aria-label="Links oficiales de Aura Boutique">
                <div className={styles.brandBlock}>
                    <div className={styles.avatarWrap}>
                        {settings.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={styles.avatarImage} src={settings.avatar_url} alt={settings.title} />
                        ) : (
                            <div className={styles.avatarFallback} aria-hidden="true">
                                <span>Aura</span>
                            </div>
                        )}
                    </div>
                    <p className={styles.kicker}>Links oficiales</p>
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
                                className={`${styles.linkItem} ${item.is_featured ? styles.featuredLink : ''}`}
                                href={item.url}
                                target={external ? '_blank' : undefined}
                                rel={external ? 'noreferrer' : undefined}
                            >
                                {item.icon_url ? (
                                    <span className={styles.linkIcon}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.icon_url} alt={item.title} />
                                    </span>
                                ) : (
                                    <span className={styles.linkType}>{typeLabels[item.link_type] ?? 'LINK'}</span>
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
                    <span>Aura Boutique</span>
                    <a href="/shop">Ir al catalogo</a>
                </footer>
            </section>
        </main>
    );
}
