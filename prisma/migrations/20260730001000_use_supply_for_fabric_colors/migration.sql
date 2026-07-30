CREATE TABLE dbo.supply_color_stock (
    supply_color_id uniqueidentifier NOT NULL CONSTRAINT DF_supply_color_stock_id DEFAULT newsequentialid(),
    supply_id uniqueidentifier NOT NULL,
    color_id uniqueidentifier NOT NULL,
    stock decimal(18,4) NOT NULL CONSTRAINT DF_supply_color_stock_stock DEFAULT 0,
    min_stock decimal(18,4) NOT NULL CONSTRAINT DF_supply_color_stock_min DEFAULT 0,
    unit_cost_override decimal(18,4) NULL,
    is_available bit NOT NULL CONSTRAINT DF_supply_color_stock_available DEFAULT 1,
    is_active bit NOT NULL CONSTRAINT DF_supply_color_stock_active DEFAULT 1,
    created_at datetime2 NOT NULL CONSTRAINT DF_supply_color_stock_created DEFAULT sysutcdatetime(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_supply_color_stock_updated DEFAULT sysutcdatetime(),
    CONSTRAINT PK_supply_color_stock PRIMARY KEY (supply_color_id),
    CONSTRAINT FK_supply_color_stock_supply FOREIGN KEY (supply_id) REFERENCES dbo.supply(supply_id) ON DELETE CASCADE,
    CONSTRAINT FK_supply_color_stock_color FOREIGN KEY (color_id) REFERENCES dbo.custom_color(color_id) ON DELETE CASCADE,
    CONSTRAINT UX_supply_color_stock UNIQUE (supply_id, color_id)
);

CREATE INDEX IX_supply_color_stock_color ON dbo.supply_color_stock (color_id);

IF OBJECT_ID(N'dbo.fabric', N'U') IS NOT NULL
BEGIN
    INSERT INTO dbo.supply (name, type, unit, unit_cost, stock, min_stock, is_active)
    SELECT f.name, N'TELA', f.unit, f.unit_cost, COALESCE(SUM(fcs.stock), 0), 0, f.is_active
    FROM dbo.fabric f
    LEFT JOIN dbo.fabric_color_stock fcs ON fcs.fabric_id = f.fabric_id
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.supply s WHERE s.name = f.name AND s.type = N'TELA'
    )
    GROUP BY f.fabric_id, f.name, f.unit, f.unit_cost, f.is_active;
END;

IF OBJECT_ID(N'dbo.fabric_color_stock', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.fabric', N'U') IS NOT NULL
BEGIN
    INSERT INTO dbo.supply_color_stock (supply_id, color_id, stock, min_stock, unit_cost_override, is_available, is_active)
    SELECT s.supply_id, fcs.color_id, fcs.stock, fcs.min_stock, fcs.unit_cost_override, fcs.is_available, fcs.is_active
    FROM dbo.fabric_color_stock fcs
    JOIN dbo.fabric f ON f.fabric_id = fcs.fabric_id
    JOIN dbo.supply s ON s.name = f.name AND s.type = N'TELA'
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.supply_color_stock scs WHERE scs.supply_id = s.supply_id AND scs.color_id = fcs.color_id
    );
END;

IF OBJECT_ID(N'dbo.fabric_color_stock', N'U') IS NOT NULL
    DROP TABLE dbo.fabric_color_stock;

IF OBJECT_ID(N'dbo.fabric', N'U') IS NOT NULL
    DROP TABLE dbo.fabric;
