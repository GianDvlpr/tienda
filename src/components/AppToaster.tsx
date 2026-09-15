'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import styles from './shop/shopToast.module.css';

export default function AppToaster() {
    const pathname = usePathname();
    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

    if (isAdmin) return <Toaster position="top-center" richColors toastOptions={{ style: { width: 'fit-content', minWidth: '250px', margin: '0 auto' } }} />;

    return <Toaster position="top-center" theme="light" closeButton duration={5000}
        containerAriaLabel="Notificaciones" mobileOffset={{ top: 20, left: 16, right: 16 }}
        toastOptions={{ closeButtonAriaLabel: 'Cerrar notificación', classNames: {
            toast: styles.toast, title: styles.title, description: styles.description,
            actionButton: styles.action, closeButton: styles.close, icon: styles.icon,
            error: styles.error, warning: styles.warning,
        } }} />;
}
