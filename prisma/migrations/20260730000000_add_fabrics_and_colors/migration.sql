CREATE TABLE dbo.custom_color (
    color_id uniqueidentifier NOT NULL CONSTRAINT DF_custom_color_id DEFAULT newsequentialid(),
    name nvarchar(100) NOT NULL,
    hex nvarchar(20) NOT NULL,
    sort_order int NOT NULL CONSTRAINT DF_custom_color_sort_order DEFAULT 0,
    is_available bit NOT NULL CONSTRAINT DF_custom_color_is_available DEFAULT 1,
    is_active bit NOT NULL CONSTRAINT DF_custom_color_is_active DEFAULT 1,
    created_at datetime2 NOT NULL CONSTRAINT DF_custom_color_created_at DEFAULT sysutcdatetime(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_custom_color_updated_at DEFAULT sysutcdatetime(),
    CONSTRAINT PK_custom_color PRIMARY KEY (color_id),
    CONSTRAINT UX_custom_color_name UNIQUE (name)
);

CREATE INDEX IX_custom_color_active_order ON dbo.custom_color (is_active, sort_order);

CREATE TABLE dbo.fabric (
    fabric_id uniqueidentifier NOT NULL CONSTRAINT DF_fabric_id DEFAULT newsequentialid(),
    name nvarchar(200) NOT NULL,
    description nvarchar(max) NULL,
    unit nvarchar(20) NOT NULL CONSTRAINT DF_fabric_unit DEFAULT N'MT',
    unit_cost decimal(18,4) NOT NULL CONSTRAINT DF_fabric_unit_cost DEFAULT 0,
    is_active bit NOT NULL CONSTRAINT DF_fabric_is_active DEFAULT 1,
    created_at datetime2 NOT NULL CONSTRAINT DF_fabric_created_at DEFAULT sysutcdatetime(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_fabric_updated_at DEFAULT sysutcdatetime(),
    CONSTRAINT PK_fabric PRIMARY KEY (fabric_id),
    CONSTRAINT UX_fabric_name UNIQUE (name)
);

CREATE TABLE dbo.fabric_color_stock (
    fabric_color_id uniqueidentifier NOT NULL CONSTRAINT DF_fabric_color_stock_id DEFAULT newsequentialid(),
    fabric_id uniqueidentifier NOT NULL,
    color_id uniqueidentifier NOT NULL,
    stock decimal(18,4) NOT NULL CONSTRAINT DF_fabric_color_stock_stock DEFAULT 0,
    min_stock decimal(18,4) NOT NULL CONSTRAINT DF_fabric_color_stock_min DEFAULT 0,
    unit_cost_override decimal(18,4) NULL,
    is_available bit NOT NULL CONSTRAINT DF_fabric_color_stock_available DEFAULT 1,
    is_active bit NOT NULL CONSTRAINT DF_fabric_color_stock_active DEFAULT 1,
    created_at datetime2 NOT NULL CONSTRAINT DF_fabric_color_stock_created DEFAULT sysutcdatetime(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_fabric_color_stock_updated DEFAULT sysutcdatetime(),
    CONSTRAINT PK_fabric_color_stock PRIMARY KEY (fabric_color_id),
    CONSTRAINT FK_fabric_color_stock_fabric FOREIGN KEY (fabric_id) REFERENCES dbo.fabric(fabric_id) ON DELETE CASCADE,
    CONSTRAINT FK_fabric_color_stock_color FOREIGN KEY (color_id) REFERENCES dbo.custom_color(color_id) ON DELETE CASCADE,
    CONSTRAINT UX_fabric_color_stock UNIQUE (fabric_id, color_id)
);

CREATE INDEX IX_fabric_color_stock_color ON dbo.fabric_color_stock (color_id);

INSERT INTO dbo.custom_color (name, hex, sort_order, is_available, is_active)
VALUES
(N'Negro', N'#1A1A1E', 1, 1, 1),
(N'Azul Noche', N'#20254B', 2, 1, 1),
(N'Vino', N'#7B2B55', 3, 1, 1),
(N'Chocolate', N'#7B553D', 4, 1, 1),
(N'Verde Botella', N'#2C5C54', 5, 1, 1),
(N'Rojo', N'#C92B31', 6, 1, 1),
(N'Azul Rey', N'#5565D9', 7, 1, 1),
(N'Naranja', N'#E75A3C', 8, 1, 1),
(N'Turquesa', N'#5FD4DF', 9, 0, 1),
(N'Fucsia', N'#B73AAE', 10, 1, 1),
(N'Orquídea', N'#C85DBA', 11, 1, 1),
(N'Rosa Barbie', N'#E45FC8', 12, 1, 1),
(N'Verde Salvia', N'#8A9488', 13, 1, 1),
(N'Rosa Palo', N'#DFC7D7', 14, 1, 1),
(N'Topo', N'#A3978D', 15, 1, 1),
(N'Beige Oscuro', N'#C7B29A', 16, 1, 1),
(N'Marfil', N'#E8E2D5', 17, 1, 1),
(N'Beige Claro', N'#F2E7D7', 18, 1, 1),
(N'Verde Menta', N'#BDDCC8', 19, 1, 1),
(N'Lavanda', N'#AEA7E9', 20, 1, 1),
(N'Rosa Bebé', N'#E7D0E2', 21, 1, 1),
(N'Celeste Bebé', N'#B8D5F1', 22, 1, 1),
(N'Amarillo Pastel', N'#DFE08F', 23, 1, 1),
(N'Gris Perla', N'#E4E7EE', 24, 1, 1),
(N'Perla', N'#FCFCFC', 25, 1, 1);
