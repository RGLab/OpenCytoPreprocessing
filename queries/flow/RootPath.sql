SELECT DISTINCT
 FilePathRoot AS RootPath
FROM
 Runs
WHERE
 FilePathRoot IS NOT NULL AND
 ProtocolStep = 'Keywords'
