SELECT DISTINCT
 FCSFiles.Run.FilePathRoot  AS RootPath
--  , FCSFiles.RowId             AS FileId
FROM
 FCSFiles
WHERE
 FCSFiles.Run.FilePathRoot IS NOT NULL
