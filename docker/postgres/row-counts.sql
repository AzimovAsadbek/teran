-- Row counts of every table in the public schema, to compare two copies of the database (a backup
-- against the live one, the new server against the old one). Read-only, and independent of the
-- schema version: it counts whatever tables the copy has.
--   psql "<connection>" -X -q -f docker/postgres/row-counts.sql
SELECT table_name AS records,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), false, true, '')))[1]::text::bigint AS count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
