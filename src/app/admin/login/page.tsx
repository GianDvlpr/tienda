'use client';
import { toast } from 'sonner';

import { useState } from 'react';
import { Card, Form, Input, Button, Typography } from 'antd';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function AdminLoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                toast.success('Bienvenido de nuevo');
                router.push('/admin');
            } else if (res.status === 429) {
                toast.error('Demasiados intentos. Intenta nuevamente en 15 minutos.');
            } else if (res.status >= 500) {
                toast.error('El servidor no pudo iniciar la sesión. Contacta al administrador para revisar la configuración.');
            } else {
                toast.error('Credenciales incorrectas');
            }
        } catch {
            toast.error('No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3} style={{ margin: 0 }}>Aura Admin</Title>
                    <Typography.Text type="secondary">Ingresa para administrar el catálogo</Typography.Text>
                </div>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item 
                        label="Usuario" 
                        name="username" 
                        rules={[{ required: true, message: 'Ingresa tu usuario' }]}
                    >
                        <Input size="large" />
                    </Form.Item>

                    <Form.Item 
                        label="Contraseña" 
                        name="password" 
                        rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
                    >
                        <Input.Password size="large" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                            Iniciar Sesión
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
