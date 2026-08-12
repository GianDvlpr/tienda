'use client';

import { Button, Result } from 'antd';
import { useEffect } from 'react';

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Error en la tienda:', error);
    }, [error]);

    return (
        <div style={{ padding: '120px 24px 80px', maxWidth: 600, margin: '0 auto' }}>
            <Result
                status="error"
                title="Algo salió mal"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'Ocurrió un error inesperado al cargar la página. Por favor, intenta nuevamente.'
                }
                extra={[
                    <Button type="primary" key="retry" onClick={() => reset()}>
                        Reintentar
                    </Button>,
                    <Button key="back" href="/shop">
                        Volver a la tienda
                    </Button>,
                ]}
            />
        </div>
    );
}
