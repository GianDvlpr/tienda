'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Input, Space } from 'antd';
import { toast } from 'sonner';
import { fetcher } from '@/lib/fetcher';
export default function PaymentReconciliation({ orderId, onDone }: { orderId: string; onDone: () => void }) {
    const { data: session } = useSWR<{ role: string }>('/api/admin/me', fetcher);
    const [chargeId, setChargeId] = useState('');
    const [busy, setBusy] = useState(false);
    if (session?.role !== 'ADMIN') return null;
    return <Alert type="warning" title="Pago pendiente de confirmación" description={<Space orientation="vertical">
        <span>Busca el pedido en Culqi. Al conciliar se verifican cargo, moneda, importe y pedido antes de registrar el cobro. No se vuelve a cobrar.</span>
        <Input value={chargeId} onChange={event => setChargeId(event.target.value)} placeholder="ID de cargo chr_... (opcional si ya está guardado)" />
        <Button loading={busy} onClick={async () => {
            setBusy(true);
            try {
                const response = await fetch('/api/admin/orders/' + orderId + '/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charge_id: chargeId.trim() || undefined }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                toast.success('Pago conciliado'); onDone();
            } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo conciliar'); }
            finally { setBusy(false); }
        }}>Verificar cargo y conciliar</Button>
    </Space>} />;
}
