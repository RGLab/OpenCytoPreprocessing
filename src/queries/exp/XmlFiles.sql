SELECT DISTINCT
 DataInputs.Data.Name AS FileName,
 DataInputs.Data.DataFileUrl AS FilePath
FROM
 DataInputs
WHERE
 DataInputs.Role = 'Workspace'
