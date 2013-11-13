SELECT DISTINCT
 Data.Name AS FileName,
 Data.DataFileUrl AS FilePath
FROM
 DataInputs
WHERE
 Role = 'Workspace'
