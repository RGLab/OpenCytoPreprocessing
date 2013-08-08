SELECT DISTINCT
 Runs.FilePathRoot AS RootPath
FROM
 Runs
WHERE
 Runs.FilePathRoot IS NOT NULL AND
 Runs.ProtocolStep = 'Keywords'
