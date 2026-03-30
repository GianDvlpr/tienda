'use client';

import { Typography, Divider } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function TermsPage() {
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 80px" }}>
            <Title level={1} style={{ fontWeight: 300, letterSpacing: 2, textAlign: 'center' }}>TÉRMINOS Y CONDICIONES</Title>
            <Divider />
            
            <Paragraph>
                <Text strong>Última actualización: {new Date().toLocaleDateString('es-PE')}</Text>
            </Paragraph>

            <Paragraph>
                Bienvenido a <Text strong>AURA</Text>. Al acceder y utilizar nuestro sitio web, usted acepta cumplir con los siguientes términos y condiciones relacionados con la compra de nuestros productos.
            </Paragraph>

            <Title level={4}>1. IDENTIFICACIÓN DE LA EMPRESA</Title>
            <Paragraph>
                El titular de este sitio web es AURA, con RUC <Text strong>2061334376</Text>. Todas las transacciones realizadas en este portal están sujetas a la legislación peruana vigente.
            </Paragraph>

            <Title level={4}>2. PROCESO DE COMPRA Y PAGOS</Title>
            <Paragraph>
                Los precios de los productos incluyen el IGV y están expresados en Soles (S/). Las compras pueden realizarse mediante tarjetas de crédito/débito a través de la pasarela de pagos <Text strong>Culqi</Text>, o mediante nuestro canal oficial de WhatsApp. 
            </Paragraph>
            <Paragraph>
                AURA garantiza la seguridad de sus datos bancarios mediante el uso de protocolos de encriptación estándar de la industria suministrados por nuestros proveedores de pagos.
            </Paragraph>

            <Title level={4}>3. DISPONIBILIDAD DE PRODUCTOS</Title>
            <Paragraph>
                Nuestro stock se actualiza en tiempo real; sin embargo, en casos excepcionales de error técnico, si un producto no estuviera disponible después de realizada la compra, se procederá al reembolso total o cambio por otra prenda de igual valor a elección del cliente.
            </Paragraph>

            <Title level={4}>4. ENVÍOS</Title>
            <Paragraph>
                Realizamos envíos a todo el Perú. Los plazos de entrega varían entre 2 a 5 días hábiles dependiendo de la ubicación. El costo del envío se detalla al momento de finalizar la compra o se coordina directamente por WhatsApp para destinos específicos.
            </Paragraph>

            <Title level={4}>5. PROPIEDAD INTELECTUAL</Title>
            <Paragraph>
                Todo el contenido, marcas, logotipos y fotografías en este sitio son propiedad exclusiva de AURA. Queda prohibida su reproducción total o parcial sin autorización expresa.
            </Paragraph>

            <Title level={4}>6. CONTACTO</Title>
            <Paragraph>
                Para cualquier consulta sobre estos términos, puede contactarnos a través de nuestro WhatsApp oficial o redes sociales.
            </Paragraph>
        </div>
    );
}
