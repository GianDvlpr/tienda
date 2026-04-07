"use client";

import React, { useState } from 'react';
import { 
    Form, 
    Input, 
    Button, 
    Typography, 
    Card, 
    Row, 
    Col, 
    Select, 
    Radio, 
    Divider, 
    Checkbox, 
    Space, 
    Result,
    Alert,
    notification
} from 'antd';
import { BookFilled, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ReclamacionesClient() {
    const [form] = Form.useForm();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reclamoId, setReclamoId] = useState('');

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await fetch('/api/store/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error('Error al enviar el reclamo');

            const data = await response.json();
            setReclamoId(data.id || 'REC-' + Math.floor(Math.random() * 1000000));
            setSubmitted(true);
            window.scrollTo(0, 0);
        } catch (error) {
            console.error(error);
            notification.error({
                message: 'Error al enviar',
                description: 'No pudimos registrar tu reclamo. Por favor intenta más tarde.',
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ maxWidth: 800, margin: '120px auto', padding: '0 24px' }}>
                <Card variant="borderless">
                    <Result
                        status="success"
                        title="Reclamo Registrado Exitosamente"
                        subTitle={`Tu número de atención es: ${reclamoId}. Te contactaremos en un plazo máximo de 15 días hábiles.`}
                        extra={[
                            <Link href="/shop" key="home">
                                <Button type="primary" icon={<ArrowLeftOutlined />}>Volver a la Tienda</Button>
                            </Link>
                        ]}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '120px auto', padding: '0 24px' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                        <BookFilled style={{ fontSize: 48, color: '#C89F53', marginBottom: 16 }} />
                        <Title level={2}>Libro de Reclamaciones</Title>
                        <Paragraph type="secondary">
                            Lamentamos el malestar generado, para darte una respuesta oportuna por favor completa la siguiente información:
                        </Paragraph>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        requiredMark={true}
                    >
                        <Divider>1. Identificación del Consumidor</Divider>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="fullName" label="Nombre Completo" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
                                    <Input placeholder="Ej. Ana García" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="email" label="Correo Electrónico" rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}>
                                    <Input placeholder="ana@ejemplo.com" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="phone" label="Teléfono / Celular" rules={[{ required: true, message: 'Ingresa tu teléfono' }]}>
                                    <Input placeholder="999 999 999" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="documentType" label="Tipo de Documento" initialValue="DNI" rules={[{ required: true, message: 'Selecciona un tipo' }]}>
                                    <Select size="large">
                                        <Option value="DNI">DNI</Option>
                                        <Option value="CE">Carnet de Extranjería</Option>
                                        <Option value="RUC">RUC</Option>
                                        <Option value="PASAPORTE">Pasaporte</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="documentNumber" label="Número de Documento" rules={[{ required: true, message: 'Ingresa el número' }]}>
                                    <Input placeholder="Documento de identidad" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item name="address" label="Domicilio" rules={[{ required: true, message: 'Ingresa tu dirección' }]}>
                                    <Input placeholder="Av. Principal 123, Distrito" size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider>2. Detalle del Reclamo / Queja</Divider>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="type" label="Tipo" initialValue="RECLAMO" rules={[{ required: true }]}>
                                    <Radio.Group>
                                        <Radio value="RECLAMO">Reclamo (Disconformidad con el producto/servicio)</Radio>
                                        <Radio value="QUEJA">Queja (Malestar por la atención)</Radio>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="orderId" label="Nro de Pedido (Opcional)">
                                    <Input placeholder="Ej. AURA-1234" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item name="claimDescription" label="Detalle de su reclamo o queja" rules={[{ required: true, message: 'Describe el incidente' }]}>
                                    <TextArea rows={4} placeholder="Describe detalladamente lo sucedido..." />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item name="claimRequest" label="Pedido (Qué solicita)" rules={[{ required: true, message: 'Indica qué esperas' }]}>
                                    <TextArea rows={3} placeholder="Ej. Devolución del dinero, cambio de producto..." />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider />
                        <Form.Item name="acceptTerms" valuePropName="checked" rules={[{ 
                            validator: (_, value) => value ? Promise.resolve() : Promise.reject('Debes aceptar para continuar')
                        }]}>
                            <Checkbox>
                                Declaro ser el titular del servicio y acepto los términos de respuesta (máximo 15 días hábiles).
                            </Checkbox>
                        </Form.Item>

                        <Form.Item>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                size="large" 
                                block 
                                icon={<SendOutlined />}
                                loading={loading}
                                style={{ height: 50, background: '#000', borderColor: '#000', fontSize: 16 }}
                            >
                                Enviar Libro de Reclamaciones
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </div>
    );
}
