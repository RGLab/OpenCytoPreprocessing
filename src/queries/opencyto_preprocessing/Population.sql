SELECT DISTINCT
 projections.path         AS Path,
 projections.name         AS Name,
 projections.gsid         AS AnalysisId
FROM
 projections
ORDER BY
 projections.path
