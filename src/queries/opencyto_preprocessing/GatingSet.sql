SELECT
 gsid           	AS Id,
 gsname         	AS Name,
 objlink        	AS Path,
 gsdescription  	AS Tooltip,
 container.EntityId	AS EntityId
FROM
 gstbl
