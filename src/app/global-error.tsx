'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Error global:', error);
    }, [error]);

    return (
        <html lang="es">
            <body>
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center',
                        padding: 24,
                    }}
                >
                    <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Algo salió mal</h1>
                    <p style={{ fontSize: 15, color: '#666', maxWidth: 420, margin: 0 }}>
                        {process.env.NODE_ENV === 'development'
                            ? error.message
                            : 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 24px',
                            fontSize: 14,
                            borderRadius: 8,
                            border: 'none',
                            background: '#1677ff',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            </body>
        </html>
    );
}
