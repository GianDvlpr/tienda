import React, { useState } from 'react';
import { Space, InputNumber, Button, Typography, theme, Row, Col } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';

interface UnitCostHelperProps {
  onCalculate: (unitCost: number, qty: number) => void;
  label?: string;
}

export default function UnitCostHelper({ onCalculate, label }: UnitCostHelperProps) {
  const { token } = theme.useToken();
  const [total, setTotal] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const apply = () => {
    if (total !== null && qty && qty > 0) {
      // Use 4 decimals to avoid precision loss in small items like buttons
      const unitCost = Number((total / qty).toFixed(4));
      onCalculate(unitCost, qty);
    }
  };

  return (
    <div style={{ 
        marginTop: 4, 
        marginBottom: 8, 
        border: `1px solid ${token.colorBorderSecondary}`, 
        borderRadius: token.borderRadiusSM, 
        padding: isOpen ? '12px' : '4px 8px',
        backgroundColor: isOpen ? token.colorBgLayout : 'transparent',
        transition: 'all 0.3s'
    }}>
      <Button 
        type="link" 
        size="small" 
        icon={<CalculatorOutlined />} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: 0, height: 'auto', fontSize: 12 }}
      >
        {isOpen ? 'Ocultar Asistente' : (label || '¿Calculadora de costo por lote?')}
      </Button>
      
      {isOpen && (
        <div style={{ marginTop: 12 }}>
          <Row gutter={[8, 8]} align="bottom">
            <Col xs={24} sm={7}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Typography.Text type="secondary" style={{ fontSize: 10, marginBottom: 4 }}>PRECIO TOTAL</Typography.Text>
                <InputNumber 
                  size="small" 
                  placeholder="S/ 0.00" 
                  value={total} 
                  onChange={v => setTotal(v)} 
                  min={0}
                  style={{ width: '100%', minWidth: 80 }}
                />
              </div>
            </Col>
            <Col xs={4} sm={1} style={{ textAlign: 'center', fontWeight: 'bold', color: token.colorTextDescription, paddingBottom: 6 }}>
              /
            </Col>
            <Col xs={20} sm={7}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Typography.Text type="secondary" style={{ fontSize: 10, marginBottom: 4 }}>CANTIDAD</Typography.Text>
                <InputNumber 
                  size="small" 
                  placeholder="Cant." 
                  value={qty} 
                  onChange={v => setQty(v)} 
                  min={0.0001}
                  style={{ width: '100%', minWidth: 80 }}
                />
              </div>
            </Col>
            <Col xs={24} sm={6}>
               <Button type="primary" size="small" onClick={apply} disabled={total === null || !qty} block>
                 Aplicar
               </Button>
            </Col>
          </Row>
          {total !== null && qty && qty > 0 && (
            <div style={{ marginTop: 8, padding: '4px 8px', background: token.colorInfoBg, borderRadius: 4, display: 'inline-block' }}>
              <Typography.Text type="secondary" style={{ fontSize: 11, color: token.colorInfo }}>
                 Resultado calculado: <strong style={{ color: token.colorInfoActive }}>S/ {(total / qty).toFixed(4)}</strong> por unidad.
              </Typography.Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
