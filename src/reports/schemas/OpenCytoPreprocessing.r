suppressMessages( library(flowWorkspace) );
suppressMessages( library(Rlabkey) );

path <- labkey.url.params$path;
name <- labkey.url.params$name;

if ( path != '' & name != '' ) {

    folderPath <- unlist( strsplit( path, split = '/' ) );
    len <- length( folderPath ) - 1;
    folderPath <- folderPath[ 0 : len ];
    folderPath <- paste( folderPath, collapse = '/' );
    
    gatingSetPath <- paste( folderPath, '/GatingSet.tar', sep = '' );

    if ( ! file.exists( gatingSetPath ) ) {
    
        print('Before parsing (unarchiving)');
    
        suppressMessages( ws <- openWorkspace( path ) );

        G <- parseWorkspace( ws, name = name );
#        G <- suppressMessages( unarchive( paste( folderPath, '/GatingSet.tar', sep = '' ) ) );

        writeProjections <- function(G,...){
            gh <- G[[1]];
            popNames <- getNodes( gh, isPath = T );
            nodeNames <- getNodes( gh );
            res <- lapply( 1:length(nodeNames), function(i){
                curPop <- popNames[i];
                curpNode <- nodeNames[i];

                #store the children gate projections
                curChildrens <- getChildren( gh, curpNode );
                if ( length( curChildrens ) > 0 ){
                    prjlist <- lapply( curChildrens, function(curChildren){
                        g <- getGate( gh, curChildren );
                        if ( class(g) == "BooleanGate" ){
                            return( NULL );
                        } else {
                            param <- parameters( g );

                            if ( length( param ) == 1 ){
                                param<-c(param,"SSC-A");
                            }
                            return( param );
                        }
                    })
                    prj <- do.call(rbind, prjlist)
                    prj <- unique(prj)
                    prj <- as.data.frame(prj)

                    colnames(prj) <- c('x_axis', 'y_axis')
                    cbind( name = curpNode, path = curPop, prj )
                } else {
                    print( 'not yet implemented' );
                }
            });

            toInsert <- do.call( rbind, res )
#            insertedRow <- labkey.insertRows( queryName = 'projections', toInsert = toInsert, ...)
        };

        print('Before writing projections');
        writeProjections( G, baseUrl = labkey.url.base, folderPath = labkey.url.path, schemaName = 'opencyto_preprocessing' );

        meta <- labkey.selectRows( baseUrl = labkey.url.base, folderPath = labkey.url.path, schemaName = 'Samples', queryName = 'Samples' );
        meta[,2] <- NULL; meta[,2] <- NULL; meta[,2] <- NULL;
        colnames(meta)[1] <- 'name';
        pData(G) <- meta;

        archive( G, gatingSetPath );

    }

}

txt <- 'all good!'; 

write(txt, file='${txtout:textOutput}');

