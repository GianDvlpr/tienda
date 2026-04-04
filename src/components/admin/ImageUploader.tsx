'use client';

import React from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

interface ImageUploaderProps {
    onUploadSuccess: (url: string, publicId: string) => void;
    buttonText?: string;
}

export default function ImageUploader({ onUploadSuccess, buttonText = "Subir Imagen" }: ImageUploaderProps) {
    return (
        <CldUploadWidget
            signatureEndpoint="/api/cloudinary/sign"
            onSuccess={(result: any) => {
                if (result.info) {
                    onUploadSuccess(result.info.secure_url, result.info.public_id);
                }
            }}
            options={{
                multiple: false,
                resourceType: "image",
                clientAllowedFormats: ["png", "jpeg", "jpg", "webp", "jfif"],
            }}
        >
            {({ open }) => {
                return (
                    <Button onClick={() => open()} icon={<UploadOutlined />} style={{ width: '100%' }}>
                        {buttonText}
                    </Button>
                );
            }}
        </CldUploadWidget>
    );
}
