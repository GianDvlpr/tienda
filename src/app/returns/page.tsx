'use client';

import { Typography, Divider } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function ReturnsPage() {
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 80px" }}>
            <Title level={1} style={{ fontWeight: 300, letterSpacing: 2, textAlign: 'center' }}>POLÍTICA DE CAMBIOS Y DEVOLUCIONES</Title>
            <Divider />
            
            <Paragraph>
                En <Text strong>AURA</Text>, queremos que estés satisfecho con tu compra. Entendemos que en ocasiones, los productos pueden no cumplir con sus expectativas, por lo cual, contamos con las siguientes políticas para asistirlo.
            </Paragraph>

            <Title level={4}>1. PLAZOS PARA CAMBIOS Y DEVOLUCIONES</Title>
            <Paragraph>
                Nuestros clientes disponen de un plazo de hasta <Text strong>7 días calendario</Text> a partir de la recepción del producto para solicitar un cambio o devolución de dinero, de acuerdo con la Ley de Protección al Consumidor.
            </Paragraph>

            <Title level={4}>2. CONDICIONES DE LAS PRENDAS</Title>
            <Paragraph>
                Para proceder con cualquier solicitud de cambio o devolución, es indispensable que:
            </Paragraph>
            <ul>
                <li>El producto se encuentre en perfectas condiciones, tal cual fue entregado.</li>
                <li>No muestre signos de haber sido usado, lavado o dañado por el cliente.</li>
                <li>Conserve sus etiquetas originales de fábrica y empaques sin daños.</li>
                <li>Se presente el comprobante de pago o confirmación de pedido.</li>
            </ul>

            <Title level={4}>3. PROCESO DE CAMBIO</Title>
            <Paragraph>
                Los cambios se podrán realizar por otra talla o por cualquier otro producto disponible en nuestra tienda. Si el nuevo producto tiene un costo mayor, el cliente deberá cancelar la diferencia. En caso de ser menor, se le entregará una nota de crédito a su favor por el saldo restante. 
            </Paragraph>
            <Paragraph>
                <Text type="secondary">Nota: El costo de envío para devoluciones corre por cuenta del cliente, a menos que el error sea de fábrica o de envío por parte de AURA.</Text>
            </Paragraph>

            <Title level={4}>4. REEMBOLSOS</Title>
            <Paragraph>
                Una vez recepcionado el producto devuelto y verificado su estado óptimo, procederemos con el reembolso del dinero. El tiempo de procesamiento para reembolsos a tarjetas vía <Text strong>Culqi</Text> puede tomar entre 10 a 25 días hábiles dependiendo de la entidad bancaria del cliente.
            </Paragraph>

            <Divider />
            
            <Paragraph style={{ textAlign: "center", fontStyle: "italic" }}>
                AURA (RUC 2061334376) se reserva el derecho de rechazar devoluciones que no cumplan con las condiciones arriba mencionadas.
            </Paragraph>
        </div>
    );
}
