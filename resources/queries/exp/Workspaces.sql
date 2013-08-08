SELECT DISTINCT
 DataInputs.Data.Name AS FileName,
 SUBSTRING( DataInputs.Data.DataFileUrl, 6 ) AS FilePath
FROM
 DataInputs
WHERE
 DataInputs.Role = 'Workspace'
