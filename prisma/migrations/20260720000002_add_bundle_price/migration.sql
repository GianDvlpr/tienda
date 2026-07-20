IF COL_LENGTH('dbo.bundle_promotion', 'bundle_price') IS NULL
BEGIN
    ALTER TABLE dbo.bundle_promotion
    ADD bundle_price DECIMAL(18, 2) NULL;
END;
