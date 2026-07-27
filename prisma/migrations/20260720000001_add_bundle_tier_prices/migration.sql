IF COL_LENGTH('dbo.bundle_promotion', 'tier_2_price') IS NULL
BEGIN
    ALTER TABLE dbo.bundle_promotion
    ADD tier_2_price DECIMAL(18, 2) NULL;
END;

IF COL_LENGTH('dbo.bundle_promotion', 'tier_3_price') IS NULL
BEGIN
    ALTER TABLE dbo.bundle_promotion
    ADD tier_3_price DECIMAL(18, 2) NULL;
END;
