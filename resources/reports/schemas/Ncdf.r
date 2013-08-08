suppressMessages( library(ncdfFlow) );
suppressMessages( library(digest) );
suppressMessages( library(tools) );

rootPath <- labkey.url.params$path;

filesArray <- list.files( rootPath, pattern = '*.fcs', full.names=TRUE );

pathToCDF   <- paste( rootPath, '/Files.cdf', sep='' );
pathToHash  <- paste( rootPath, '/Hash.rda', sep='' );

update <- function( filesArray, pathToCDF, pathToHash ){
	print( 'NETCDF FILE NEEDS TO BE CREATED OR UPDATED: READING FILES AND CONVERTING THEM TO A NETCDF FILE' )

	system.time(
    	read.ncdfFlowSet( files = filesArray, ncdfFile = pathToCDF, isSaveMeta = TRUE )
	);


	print( 'GENERATING AND SAVING THE HASH FILE' );

    filesEncodings <- md5sum( c( filesArray, pathToCDF ) );

    currentHashValue <- digest(     paste(
                                        paste( filesEncodings, collapse = '' ),
                                        paste( names(filesEncodings), collapse = '' ),
                                        sep = ''
                                    )
                              );

    save( currentHashValue, file = pathToHash );

    return('NetCDF file created/updated.');
};

if ( ! file.exists( pathToCDF ) ) {
	txt <- update( filesArray, pathToCDF, pathToHash );
} else {
    if ( file.exists( pathToHash ) ){
        load( pathToHash );

        storedHashValue <- currentHashValue;

        filesEncodings <- md5sum( c( filesArray, pathToCDF ) );

        currentHashValue <- digest(     paste(
                                            paste( filesEncodings, collapse = '' ),
                                            paste( names(filesEncodings), collapse = '' ),
                                            sep = ''
                                        )
                                  )

        if ( identical( storedHashValue, currentHashValue ) ){
            txt <- 'All files seem up to date.';
        } else{
        	print( 'NETCDF FILE NEEDS TO BE CREATED OR UPDATED: READING FILES AND CONVERTING THEM TO A NETCDF FILE' )

        	system.time(
            	read.ncdfFlowSet( files = filesArray, ncdfFile = pathToCDF, isSaveMeta = TRUE )
        	);

        	print( 'GENERATING AND SAVING THE HASH FILE' );

            save( currentHashValue, file = pathToHash );

            txt <- 'NetCDF file created/updated.';
        }
    } else {
        txt <- update( filesArray, pathToCDF, pathToHash );
    }
}

#ls.str();

write(txt, file='${txtout:textOutput}');
