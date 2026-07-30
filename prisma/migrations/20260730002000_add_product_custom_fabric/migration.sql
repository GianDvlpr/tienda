ALTER TABLE dbo.product
ADD custom_fabric_supply_id uniqueidentifier NULL;

ALTER TABLE dbo.product
ADD CONSTRAINT FK_product_custom_fabric_supply
FOREIGN KEY (custom_fabric_supply_id) REFERENCES dbo.supply(supply_id);

CREATE INDEX IX_product_custom_fabric_supply ON dbo.product(custom_fabric_supply_id);
