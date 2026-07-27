ALTER TABLE [dbo].[order_header]
ADD [sales_channel] NVARCHAR(30) NOT NULL CONSTRAINT [DF_order_sales_channel] DEFAULT N'SHOP';

ALTER TABLE [dbo].[order_header]
ADD [external_reference] NVARCHAR(200) NULL;

CREATE INDEX [IX_order_sales_channel_created]
ON [dbo].[order_header]([sales_channel], [created_at] DESC);
