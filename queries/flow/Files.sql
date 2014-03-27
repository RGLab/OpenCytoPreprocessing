SELECT
 *
FROM
 FCSFiles
WHERE
 Run.FCSFileCount != 0 AND
 Run.ProtocolStep = 'Analysis'
