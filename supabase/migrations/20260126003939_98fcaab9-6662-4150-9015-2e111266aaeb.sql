-- Create a function to get storage usage by bucket
CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS TABLE (
  bucket_id TEXT,
  bucket_name TEXT,
  file_count BIGINT,
  total_size BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT 
    b.id::TEXT as bucket_id,
    b.name::TEXT as bucket_name,
    COUNT(o.id)::BIGINT as file_count,
    COALESCE(SUM((o.metadata->>'size')::BIGINT), 0)::BIGINT as total_size
  FROM storage.buckets b
  LEFT JOIN storage.objects o ON b.id = o.bucket_id
  GROUP BY b.id, b.name
  ORDER BY b.name;
$$;