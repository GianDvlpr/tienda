IF COL_LENGTH('dbo.order_header', 'shipping_dni') IS NULL
BEGIN
    ALTER TABLE dbo.order_header ADD shipping_dni NVARCHAR(20) NULL;
END;
