SELECT
 Name AS FileName,
 Run.FilePathRoot || '/' || Name AS FilePath
FROM
 FCSFiles
