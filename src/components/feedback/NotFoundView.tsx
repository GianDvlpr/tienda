import Link from 'next/link';
import styles from './NotFoundView.module.css';

type Props = { kind?: 'product' | 'order' | 'page' };

const content = {
    product: {
        eyebrow: 'UNA NUEVA BÚSQUEDA, UN NUEVO LOOK',
        title: 'Esta prenda no está disponible',
        description: 'No encontramos el producto que buscas. Puede que el enlace haya cambiado o que la prenda ya no esté en nuestro catálogo.',
        hint: 'Tu próximo favorito puede estar en nuestra colección.',
        action: 'Explorar el catálogo',
    },
    order: {
        eyebrow: 'SEGUIMIENTO DE TU PEDIDO',
        title: 'No pudimos encontrar tu pedido',
        description: 'Revisa que hayas abierto el enlace completo que te enviamos al confirmar tu pedido. Si aún no puedes verlo, estamos aquí para ayudarte.',
        hint: 'No necesitas hacer otro pedido. Escríbenos y revisamos tu seguimiento.',
        action: 'Volver a la tienda',
    },
    page: {
        eyebrow: 'SIGAMOS EXPLORANDO',
        title: 'Esta página no está por aquí',
        description: 'El enlace puede haber cambiado o la página ya no está disponible. Te acompañamos de vuelta a nuestra colección.',
        hint: 'Siempre hay algo más por descubrir.',
        action: 'Explorar el catálogo',
    },
};

export default function NotFoundView({ kind = 'page' }: Props) {
    const copy = content[kind];
    const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51907360760').replace(/\D/g, '');
    const message = kind === 'order'
        ? 'Hola Aura, necesito ayuda para acceder al seguimiento de mi pedido.'
        : 'Hola Aura, necesito ayuda para encontrar una prenda en el catálogo.';
    const supportUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    return (
        <section className={`${styles.page} ${kind === 'order' ? styles.standalone : ''}`} aria-labelledby="not-found-title">
            {kind === 'order' && <Link href="/shop" className={styles.brand} aria-label="Aura Boutique, ir a la tienda">Aura <span>BOUTIQUE</span></Link>}
            <div className={styles.card}>
                <div className={styles.art} aria-hidden="true">
                    <span className={styles.errorCode}>404</span>
                    <div className={styles.medallion}>
                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                            {kind === 'order' ? <>
                                <path d="m14 24 22-12 22 12v25L36 61 14 49V24Z" />
                                <path d="m14 24 22 12 22-12M36 36v25M25 18l22 12v12" />
                            </> : <>
                                <path d="M29 21a7 7 0 1 1 10 6c-2 1-3 3-3 6v3" />
                                <path d="m36 36 25 16a3 3 0 0 1-2 5H13a3 3 0 0 1-2-5l25-16Z" />
                            </>}
                        </svg>
                    </div>
                    <span className={styles.artCaption}>TU ESTILO, TU ESENCIA</span>
                </div>
                <div className={styles.content}>
                    <p className={styles.eyebrow}>{copy.eyebrow}</p>
                    <h1 id="not-found-title">{copy.title}</h1>
                    <p className={styles.description}>{copy.description}</p>
                    <div className={styles.actions}>
                        <Link href="/shop" className={styles.primary}>{copy.action}<span aria-hidden="true"> →</span></Link>
                        <a href={supportUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={styles.secondary}>Contactar por WhatsApp <span aria-hidden="true">↗</span></a>
                    </div>
                    <p className={styles.hint}>{copy.hint}</p>
                </div>
            </div>
        </section>
    );
}
