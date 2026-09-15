import Link from 'next/link';
import { CarOutlined, CreditCardOutlined, WhatsAppOutlined, SwapOutlined } from '@ant-design/icons';
import styles from './shopVisual.module.css';
export default function ShopTrust() {
    const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51907360760').replace(/\D/g,'');
    return <section className={styles.trust} aria-label="Información para tu compra">
        <Link href="/terms"><CarOutlined /><span><strong>Envíos en Perú</strong><small>Consulta las condiciones de entrega</small></span></Link>
        <Link href="/terms"><CreditCardOutlined /><span><strong>Pagos con Culqi</strong><small>Conoce cómo realizar tu compra</small></span></Link>
        <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"><WhatsAppOutlined /><span><strong>Te acompañamos</strong><small>Resuelve tus dudas por WhatsApp</small></span></a>
        <Link href="/returns"><SwapOutlined /><span><strong>Compra informada</strong><small>Consulta la política de devoluciones</small></span></Link>
    </section>;
}
