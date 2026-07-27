IF COL_LENGTH('dbo.product_image', 'color') IS NULL
BEGIN
    ALTER TABLE dbo.product_image
    ADD color NVARCHAR(80) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_image_product_color'
      AND object_id = OBJECT_ID('dbo.product_image')
)
BEGIN
    CREATE INDEX IX_image_product_color
    ON dbo.product_image(product_id, color, sort_order);
END;
