-- Migrate published schemas in method_definitions to use the correct flag name
UPDATE method_definitions
SET schema_definition = REPLACE(schema_definition::text, '"hasSpecimens"', '"hasMultiDaySpecimen"')::jsonb
WHERE schema_definition::text LIKE '%hasSpecimens%';

-- Migrate audit table as well to prevent historical validation issues
UPDATE method_definitions_aud
SET schema_definition = REPLACE(schema_definition::text, '"hasSpecimens"', '"hasMultiDaySpecimen"')::jsonb
WHERE schema_definition::text LIKE '%hasSpecimens%';
