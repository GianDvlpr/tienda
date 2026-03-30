import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            fullName,
            documentType,
            documentNumber,
            address,
            phone,
            email,
            parentFullName,
            type, // PRODUCTO / SERVICIO
            amount,
            description,
            claimType, // RECLAMO / QUEJA
            claimDetail,
            consumerRequest,
        } = body;

        // Basic validation
        if (!fullName || !documentNumber || !email || !description || !claimDetail || !consumerRequest) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        // Save to database
        const complaint = await (prisma as any).complaint.create({
            data: {
                full_name: fullName,
                document_type: documentType,
                document_number: documentNumber,
                address,
                phone,
                email,
                parent_full_name: parentFullName,
                type,
                amount: amount ? Number(amount) : null,
                description,
                claim_type: claimType,
                claim_detail: claimDetail,
                consumer_request: consumerRequest,
                status: "PENDIENTE",
            },
        });

        // Format the complaint number: AURA-YEAR-NUMBER(padded to 4 digits)
        const year = new Date().getFullYear();
        const formattedNumber = `AURA-${year}-${complaint.complaint_number.toString().padStart(4, "0")}`;

        return NextResponse.json({
            success: true,
            complaintNumber: formattedNumber,
            id: complaint.complaint_id,
        });
    } catch (error: any) {
        console.error("Error creating complaint:", error);
        return NextResponse.json(
            { error: "Error interno al procesar el libro de reclamaciones" },
            { status: 500 }
        );
    }
}
