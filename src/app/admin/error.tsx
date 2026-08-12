'use client';

import { Button, Result } from 'antd';
import { useEffect } from 'react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Error en el panel de administración:', error);
    }, [error]);

    return (
        <Result
            status="error"
            title="Algo salió mal"
            subTitle={
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'Ocurrió un error inesperado. Intenta nuevamente o contacta al administrador del sistema.'
            }
            extra={[
                <Button type="primary" key="retry" onClick={() => reset()}>
                    Reintentar
                </Button>,
                <Button key="back" href="/admin">
                    Volver al inicio
                </Button>,
            ]}
        />
    );
}
