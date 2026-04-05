ALTER PROCEDURE [dbo].[USP_SHOP_LIST_PRODUCTS]
    @collection_slug NVARCHAR(255) = NULL,
    @q NVARCHAR(255) = NULL,
    @min_price DECIMAL(18,2) = NULL,
    @max_price DECIMAL(18,2) = NULL,
    @sizes_json NVARCHAR(MAX) = NULL,
    @colors_json NVARCHAR(MAX) = NULL,
    @only_in_stock BIT = 0,
    @sort NVARCHAR(50) = 'NEW',
    @page INT = 1,
    @page_size INT = 12
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@page - 1) * @page_size;

    -- Usamos una tabla temporal para mejorar el rendimiento de los conteos y filtros
    CREATE TABLE #Filtered (
        product_id UNIQUEIDENTIFIER PRIMARY KEY,
        slug NVARCHAR(255),
        name NVARCHAR(255),
        created_at DATETIME2,
        min_price DECIMAL(18,2),
        max_price DECIMAL(18,2),
        variants_in_stock INT
    );

    INSERT INTO #Filtered
    SELECT 
        p.product_id,
        p.slug,
        p.name,
        p.created_at,
        (SELECT MIN(price) FROM dbo.product_variant WHERE product_id = p.product_id) as min_price,
        (SELECT MAX(price) FROM dbo.product_variant WHERE product_id = p.product_id) as max_price,
        (SELECT SUM(stock) FROM dbo.product_variant WHERE product_id = p.product_id) as variants_in_stock
    FROM dbo.product p
    WHERE (@collection_slug IS NULL OR EXISTS (
        SELECT 1 FROM dbo.collection c 
        JOIN dbo.product_collection pc ON c.collection_id = pc.collection_id 
        WHERE pc.product_id = p.product_id AND c.slug = @collection_slug
    ))
    AND (@q IS NULL OR p.name LIKE '%' + @q + '%')
    AND (@min_price IS NULL OR EXISTS (SELECT 1 FROM dbo.product_variant v WHERE v.product_id = p.product_id AND v.price >= @min_price))
    AND (@max_price IS NULL OR EXISTS (SELECT 1 FROM dbo.product_variant v WHERE v.product_id = p.product_id AND v.price <= @max_price))
    AND (@sizes_json IS NULL OR EXISTS (
        SELECT 1 FROM OPENJSON(@sizes_json) WITH (size NVARCHAR(50) '$') sj
        JOIN dbo.product_variant v ON v.product_id = p.product_id AND v.size = sj.size
    ))
    AND (@colors_json IS NULL OR EXISTS (
        SELECT 1 FROM OPENJSON(@colors_json) WITH (color NVARCHAR(50) '$') cj
        JOIN dbo.product_variant v ON v.product_id = p.product_id AND v.color = cj.color
    ))
    AND (@only_in_stock = 0 OR EXISTS (SELECT 1 FROM dbo.product_variant v WHERE v.product_id = p.product_id AND v.stock > 0));

    -- Filtramos por precio fuera de la subconsulta si es necesario
    IF @min_price IS NOT NULL DELETE FROM #Filtered WHERE min_price < @min_price;
    IF @max_price IS NOT NULL DELETE FROM #Filtered WHERE min_price > @max_price;

    SELECT
        f.product_id,
        f.slug,
        f.name,
        f.min_price,
        f.max_price,
        f.variants_in_stock,
        img.primary_image_url,
        img.secondary_image_url
    FROM #Filtered f
    OUTER APPLY (
        SELECT 
            MIN(CASE WHEN rn = 1 THEN url END) as primary_image_url,
            MIN(CASE WHEN rn = 2 THEN url END) as secondary_image_url
        FROM (
            SELECT url, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) as rn
            FROM dbo.product_image 
            WHERE product_id = f.product_id
        ) t
        WHERE rn <= 2
    ) img
    ORDER BY
        CASE WHEN @sort = 'NEW' THEN f.created_at END DESC,
        CASE WHEN @sort = 'PRICE_ASC' THEN f.min_price END ASC,
        CASE WHEN @sort = 'PRICE_DESC' THEN f.min_price END DESC,
        CASE WHEN @sort = 'NAME_ASC' THEN f.name END ASC,
        CASE WHEN @sort = 'NAME_DESC' THEN f.name END DESC,
        f.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @page_size ROWS ONLY;

    DROP TABLE #Filtered;
END
