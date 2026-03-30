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
    Alert
} from 'antd';
import { BookFilled, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function ReclamacionesPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [complaintNumber, setComplaintNumber] = useState<string | null>(null);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await fetch('/api/store/reclamaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const data = await response.json();
            if (data.success) {
                setComplaintNumber(data.complaintNumber);
                setSubmitted(true);
                window.scrollTo(0, 0);
            } else {
                throw new Error(data.error || "Error al enviar");
            }
        } catch (error: any) {
            console.error("Error submitting claim:", error);
            alert("No se pudo enviar la reclamación. Intenta más tarde.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ maxWidth: 800, margin: '100px auto', padding: '0 24px' }}>
                <Result
                    status="success"
                    title="¡Hoja de Reclamación Registrada!"
                    subTitle={
                        <Space orientation="vertical" align="center">
                            <Text>Tu reclamo ha sido recibido correctamente bajo el número:</Text>
                            <Title level={2} style={{ color: '#52c41a' }}>{complaintNumber}</Title>
                            <Text type="secondary">Te hemos enviado una copia a tu correo electrónico registrado.</Text>
                        </Space>
                    }
                    extra={[
                        <Button type="primary" key="home" size="large" style={{ backgroundColor: '#000' }}>
                            <Link href="/shop">Volver a la Tienda</Link>
                        </Button>
                    ]}
                />
            </div>
        );
    }

    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingTop: 100, paddingBottom: 100 }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
                <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <BookFilled style={{ fontSize: 40, color: '#000', marginBottom: 16 }} />
                        <Title level={2} style={{ margin: 0, fontWeight: 300, letterSpacing: 1 }}>LIBRO DE RECLAMACIONES</Title>
                        <Text type="secondary">Conforme a lo establecido en el Código de Protección y Defensa del Consumidor</Text>
                    </div>

                    <Alert 
                        title="Tu experiencia es nuestra prioridad"
                        description="Lamentamos profundamente cualquier inconveniente. Para brindarte una respuesta personalizada y resolver tu caso lo antes posible, por favor completa los siguientes campos:"
                        type="info"
                        showIcon
                        style={{ marginBottom: 32 }}
                    />

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        requiredMark={false}
                    >
                        {/* SECTION 1: IDENTIFICATION OF CONSUMER */}
                        <Divider titlePlacement="left" style={{ borderColor: '#f0f0f0' }}>1. Identificación del Consumidor</Divider>
                        
                        <Row gutter={24}>
                            <Col xs={24} md={24}>
                                <Form.Item
                                    label="Nombre Completo"
                                    name="fullName"
                                    rules={[{ required: true, message: 'Ingresa tu nombre completo' }]}
                                >
                                    <Input placeholder="Ej: Juan Pérez García" size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    label="Tipo de Documento"
                                    name="documentType"
                                    initialValue="DNI"
                                    rules={[{ required: true }]}
                                >
                                    <Select size="large">
                                        <Option value="DNI">DNI</Option>
                                        <Option value="CE">C.E.</Option>
                                        <Option value="PASAPORTE">Pasaporte</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                                <Form.Item
                                    label="Número de Documento"
                                    name="documentNumber"
                                    rules={[{ required: true, message: 'Ingresa el número de documento' }]}
                                >
                                    <Input size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Correo Electrónico"
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Ingresa tu correo' },
                                        { type: 'email', message: 'Ingresa un correo válido' }
                                    ]}
                                >
                                    <Input placeholder="ejemplo@correo.com" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Teléfono / Celular"
                                    name="phone"
                                    rules={[{ required: true, message: 'Ingresa un número de contacto' }]}
                                >
                                    <Input size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            label="Domicilio"
                            name="address"
                            rules={[{ required: true, message: 'Ingresa tu dirección' }]}
                        >
                            <Input placeholder="Ej: Av. Las Flores 123, Urb. San Isidro, Lima" size="large" />
                        </Form.Item>

                        <Form.Item
                            label="Nombre del Padre/Madre (Solo si es menor de edad)"
                            name="parentFullName"
                        >
                            <Input size="large" />
                        </Form.Item>

                        {/* SECTION 2: IDENTIFICATION OF GOOD/SERVICE */}
                        <Divider titlePlacement="left" style={{ borderColor: '#f0f0f0', marginTop: 40 }}>2. Identificación del Bien Contratado</Divider>

                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Tipo de Bien"
                                    name="type"
                                    initialValue="PRODUCTO"
                                    rules={[{ required: true }]}
                                >
                                    <Radio.Group buttonStyle="solid">
                                        <Radio.Button value="PRODUCTO">PRODUCTO</Radio.Button>
                                        <Radio.Button value="SERVICIO">SERVICIO</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Monto Reclamado (S/)"
                                    name="amount"
                                >
                                    <Input type="number" step="0.01" prefix="S/" size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            label="Descripción del Bien / Pedido"
                            name="description"
                            rules={[{ required: true, message: 'Describe el producto o servicio' }]}
                        >
                            <Input.TextArea rows={2} placeholder="Ej: Vestido Aura Color Negro Talla S" />
                        </Form.Item>

                        {/* SECTION 3: DETAIL OF CLAIM */}
                        <Divider titlePlacement="left" style={{ borderColor: '#f0f0f0', marginTop: 40 }}>3. Detalle de la Reclamación</Divider>

                        <Form.Item
                            label="Tipo de Reclamación"
                            name="claimType"
                            initialValue="RECLAMO"
                            rules={[{ required: true }]}
                        >
                            <Radio.Group>
                                <Space orientation="vertical">
                                    <Radio value="RECLAMO">
                                        <Text strong>RECLAMO:</Text>
                                        <Text type="secondary"> Disconformidad relacionada a los productos o servicios.</Text>
                                    </Radio>
                                    <Radio value="QUEJA">
                                        <Text strong>QUEJA:</Text>
                                        <Text type="secondary"> Disconformidad no relacionada a los productos; malestar en la atención.</Text>
                                    </Radio>
                                </Space>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item
                            label="Detalles de la Queja / Reclamo"
                            name="claimDetail"
                            rules={[{ required: true, message: 'Ingresa los detalles de tu reclamo' }]}
                        >
                            <Input.TextArea rows={4} placeholder="Escribe aquí de forma detallada lo sucedido..." />
                        </Form.Item>

                        <Form.Item
                            label="Pedido / Solicitud del Consumidor"
                            name="consumerRequest"
                            rules={[{ required: true, message: 'Ingresa qué solicitas' }]}
                        >
                            <Input.TextArea rows={3} placeholder="¿Qué solución esperas por parte de la empresa?" />
                        </Form.Item>

                        <Divider style={{ marginTop: 40 }} />

                        <Form.Item
                            name="agreement"
                            valuePropName="checked"
                            rules={[
                                {
                                    validator: (_, value) =>
                                        value ? Promise.resolve() : Promise.reject(new Error('Debes aceptar el registro de datos')),
                                },
                            ]}
                        >
                            <Checkbox>
                                Declaro ser el titular del reclamo y autorizo el tratamiento de mis datos personales para la atención del mismo conforme a la Ley N° 29733.
                            </Checkbox>
                        </Form.Item>

                        <div style={{ marginTop: 32 }}>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                size="large" 
                                block 
                                loading={loading}
                                icon={<SendOutlined />}
                                style={{ height: 56, backgroundColor: '#000', borderRadius: 8, fontSize: 18, fontWeight: 500 }}
                            >
                                ENVIAR HOJA DE RECLAMACIÓN
                            </Button>
                        </div>
                        
                        <div style={{ textAlign: 'center', marginTop: 24 }}>
                            <Link href="/shop" style={{ color: '#8c8c8c' }}>
                                <ArrowLeftOutlined /> Regresar a la tienda
                            </Link>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
