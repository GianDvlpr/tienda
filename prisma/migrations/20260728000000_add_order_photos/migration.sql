CREATE TABLE dbo.order_photo (
    photo_id uniqueidentifier NOT NULL CONSTRAINT DF_order_photo_id DEFAULT newsequentialid(),
    order_id uniqueidentifier NOT NULL,
    url nvarchar(500) NOT NULL,
    public_id nvarchar(300) NULL,
    caption nvarchar(250) NULL,
    is_public_tracking bit NOT NULL CONSTRAINT DF_order_photo_public_tracking DEFAULT 0,
    created_at datetime2 NOT NULL CONSTRAINT DF_order_photo_created_at DEFAULT sysutcdatetime(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_order_photo_updated_at DEFAULT sysutcdatetime(),
    CONSTRAINT PK_order_photo PRIMARY KEY (photo_id),
    CONSTRAINT FK_order_photo_order FOREIGN KEY (order_id) REFERENCES dbo.order_header(order_id)
);

CREATE INDEX IX_order_photo_order_created ON dbo.order_photo(order_id, created_at DESC);
CREATE INDEX IX_order_photo_tracking ON dbo.order_photo(order_id, is_public_tracking, created_at DESC);
