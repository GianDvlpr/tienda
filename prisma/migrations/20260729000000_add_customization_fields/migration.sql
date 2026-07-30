ALTER TABLE dbo.product
ADD is_customizable bit NOT NULL CONSTRAINT DF_product_is_customizable DEFAULT 0,
    customization_type nvarchar(30) NULL,
    customization_surcharge decimal(18,2) NOT NULL CONSTRAINT DF_product_customization_surcharge DEFAULT 5;

ALTER TABLE dbo.order_item
ADD is_customized bit NOT NULL CONSTRAINT DF_order_item_is_customized DEFAULT 0,
    custom_measurements_json nvarchar(max) NULL,
    customization_surcharge decimal(18,2) NULL CONSTRAINT DF_order_item_customization_surcharge DEFAULT 0,
    customization_group_id nvarchar(80) NULL,
    customization_group_label nvarchar(200) NULL;

ALTER TABLE dbo.bundle_promotion
ADD customization_surcharge decimal(18,2) NOT NULL CONSTRAINT DF_bundle_customization_surcharge DEFAULT 8;
