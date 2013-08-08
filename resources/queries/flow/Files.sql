SELECT
 *
FROM
 FCSFiles
WHERE
 FCSFiles.Run.FCSFileCount != 0 AND
 FCSFiles.Run.ProtocolStep = 'Analysis'
