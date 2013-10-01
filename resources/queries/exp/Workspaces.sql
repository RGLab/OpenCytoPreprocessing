SELECT DISTINCT
 Data.Name AS FileName,
 SUBSTRING( Data.DataFileUrl, 6 ) AS FilePath
FROM
 DataInputs
WHERE
 Role = 'Workspace'
