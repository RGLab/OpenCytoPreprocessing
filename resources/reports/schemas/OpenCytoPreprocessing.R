# vim: sw=4:ts=4:nu:nospell:fdc=4
#
#  Copyright 2013 Fred Hutchinson Cancer Research Center
#
#  Licensed under the Apache License, Version 2.0 (the 'License');
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an 'AS IS' BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

analysisName            <- labkey.url.params$analysisName;
analysisDescription     <- labkey.url.params$analysisDescription;
fcsFilesParentPath      <- labkey.url.params$rootPath;
strngWorkspacePaths     <- labkey.url.params$workspacePath;
strngSampleGroupNames   <- labkey.url.params$sampleGroupName;
strngStudyVars          <- labkey.url.params$studyVars;
strngAllStudyVars       <- labkey.url.params$allStudyVars;
strngFilesIds           <- labkey.url.params$filesIds;
strngFilesNames         <- labkey.url.params$filesNames;

strngDuplicateAnalysisName <- 'There is already an analysis with the same name, delete it first, before proceeding.';

tryCatch({

    if ( exists('gsid') ){
        rm( gsid );
    }

    if ( exists('container') ){
        rm( container );
    }

    lg <- '';

    print( 'LOADING LIBRARIES ETC.' );
    lg <- paste0( lg, '\nLOADING LIBRARIES ETC.' );

    ptm <- proc.time();

    suppressMessages( library( flowIncubator ) );
    suppressMessages( library( flowWorkspace ) );
    suppressMessages( library( ncdfFlow ) );
    suppressMessages( library( Rlabkey ) );
    suppressMessages( library( digest ) );
    suppressMessages( library( Rlibstree ) );

    tempTime <- proc.time() - ptm;
    print( tempTime );
    lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );


    if ( strngWorkspacePaths != '' | strngSampleGroupNames != '' ){

        xmlPathArray <- unlist( strsplit( strngWorkspacePaths, split = ',' ) );

        xmlFilesParentPath <- getLongestCommonSubstring( xmlPathArray );

        if ( substr( xmlFilesParentPath, nchar( xmlFilesParentPath ), nchar( xmlFilesParentPath ) ) == '/' ){
            xmlFilesParentPath <- substr( xmlFilesParentPath, 1, nchar( xmlFilesParentPath ) - 1 );
        } else {
            xmlFilesParentPath <- dirname( xmlFilesParentPath );
        }

        if ( fcsFilesParentPath == '' ){
            fcsFilesParentPath <- xmlFilesParentPath;
        }

        currentHashValue <- digest( paste0( strngWorkspacePaths, strngSampleGroupNames, strngFilesIds ) );
        gatingSetPath <- paste0( xmlFilesParentPath, '/', currentHashValue );

        if ( length( list.files( gatingSetPath, pattern = 'FOLDER_LOCKED_TEMP' ) ) == 1 ){

            txt <- 'Seems that another session is already working on the same analysis, cannot proceed!';

        } else { # folder does not exist or exists and does not contain a 'lock' file

            # check the database, if there is already an entry with the same name 'analysisName'
            # if so, error out and halt before any heavy lifting!
            gsTbl <- labkey.selectRows(
                  queryName     = 'gstbl',
                , schemaName    = 'opencyto_preprocessing'
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , colFilter     = makeFilter( c( 'gsname', 'EQUALS', analysisName ) )
            );

            if ( nrow( gsTbl ) > 0 ){
                stop( strngDuplicateAnalysisName );
            }

            if ( file.exists( gatingSetPath ) ){ # folder exists and does not contain a 'lock' file

                print('UNARCHIVING THE EXISTING DATA');
                lg <- paste0( lg, '\nUNARCHIVING THE EXISTING DATA' );
                ptm <- proc.time();

                suppressMessages( G <- load_gslist( gatingSetPath ) );

                tempTime <- proc.time() - ptm;
                print( tempTime );
                lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

                txt <- 'Success: reusing the already existing data on disk';
            } else { # folder does not exist
                dir.create( gatingSetPath ); # create a new one
                file.create( paste0( gatingSetPath, '/FOLDER_LOCKED_TEMP' ) ); # create a 'lock' file

                filesNamesList <- unlist( strsplit( strngFilesNames, split = ',' ) );
                sampleGroupNameArray <- unlist( strsplit( strngSampleGroupNames, split = ',' ) );

                print('PARSING WORKSPACES');
                lg <- paste0( lg, '\nPARSING WORKSPACES' );
                ptm <- proc.time();

                wsList <- lapply( xmlPathArray, function( xmlPath ){
                     return( suppressMessages( openWorkspace( xmlPath, options = 1 ) ) );
                });

                numWorkspaces <- length( xmlPathArray );

                listOfGatingSets <- vector( 'list', numWorkspaces );

                for ( i in 1:numWorkspaces ){

                    ws <- wsList[[i]];

                    print( paste( 'working on', basename( xmlPathArray[[i]] ) ) );

                    sink('/dev/null');

                    suppressMessages(
                        G <- parseWorkspace(
                              ws
                            , name      = sampleGroupNameArray[i]
                            , isNcdf    = T
                            , path      = fcsFilesParentPath
                            , subset    = filesNamesList
                            , ncdfFile  = tempfile( pattern = 'ncfs', tmpdir = gatingSetPath, fileext = '.nc' )
                            # to make sure the temp ncdf file is created in the same partition,
                            # where it will be saved later to be able to link
                        )
                    );

                    sink();

                    if ( is.null( G[[1]] ) ){
                        txt <- 'The gating set is corrupted, gating hierarchy not present, cannot proceed, aborting';
                        stop('The gating set is corrupted, gating hierarchy not present, cannot proceed, aborting');
                    }

                    if ( ( ! exists('G') ) ){
                        txt <- 'The gating set could not be loaded - critical error, cannot proceed, aborting!';
                        stop('The gating set could not be loaded - critical error, cannot proceed, aborting!');
                    }

                    listOfGatingSets[[i]] <- G ;
                };

                listOfGatingSets <- flowIncubator:::.groupByTree( listOfGatingSets );

                if ( length( listOfGatingSets ) > 1 ){
                    toRemove <- flowIncubator:::.checkRedundantNodes( listOfGatingSets );

                    txt <- paste( 'Removed: ', paste(toRemove, collapse = '; ' ) );

                    flowIncubator:::.dropRedundantNodes( listOfGatingSets, toRemove );
                }

                listOfGatingSets <- unlist( listOfGatingSets );

                G <- flowIncubator:::.mergeGS( listOfGatingSets );

                tempTime <- proc.time() - ptm;
                print( tempTime );
                lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

                print('FETCHING METADATA ETC.');
                lg <- paste0( lg, '\nFETCHING METADATA ETC.' );
                ptm <- proc.time();

                meta <- labkey.selectRows(
                      queryName     = 'Files'
                    , schemaName    = 'flow'
                    , folderPath    = labkey.url.path
                    , baseUrl       = labkey.url.base
                    , colSelect     = c( 'Name', strngAllStudyVars ) # needs to be a vector of comma separated strings
                    , colNameOpt    = 'fieldname'
                    , colFilter     = makeFilter( c( 'RowId', 'IN', strngFilesIds ) )
                    , showHidden    = T
                );

                inds <- which( colnames(meta) != 'RowId' );

                for ( i in 1:length(inds) ){
                    ind <- inds[i];
                    meta[ , ind ] <- factor( meta[ , ind ] );
                }

                colnames(meta)[ which( colnames(meta) == 'Name' ) ]     <- 'name';
                colnames(meta)[ which( colnames(meta) == 'RowId' ) ]    <- 'fileid';

                rownames(meta) <- meta[,'name'];

                pData(G) <- meta;

                tempTime <- proc.time() - ptm;
                print( tempTime );
                lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

                print('ARCHIVING');
                lg <- paste0( lg, '\nARCHIVING' );
                ptm <- proc.time();

                suppressMessages( G <- save_gslist_labkey( G, path = gatingSetPath, overwrite = T, cdf = 'move' ) );

                tempTime <- proc.time() - ptm;
                print( tempTime );
                lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

                if ( ! file.exists( gatingSetPath ) ) {
                    txt <- 'BAD ERROR: R COULD NOT CREATE THE DATA ON DISK PROBABLY BECAUSE THERE WAS NOT ENOUGH MEMORY AVAILABLE';
                    stop( 'BAD ERROR: R COULD NOT CREATE THE DATA ON DISK PROBABLY BECAUSE THERE WAS NOT ENOUGH MEMORY AVAILABLE' );
                    return;
                } else {
                    txt <- 'Success: wrote data to disk';
                }
            }

            print('GENERATING PROJECTIONS AND WRITING TO DB');
            lg <- paste0( lg, '\nGENERATING PROJECTIONS AND WRITING TO DB' );
            ptm <- proc.time();

            writeProjections <- function( G, gsid, ... ){
                gh <- G[[1]];
                popNames    <- getNodes( gh, isPath = T );
                nodeNames   <- getNodes( gh, prefix = T );
                res <- lapply( 1:length( popNames ), function(i){
                    curPop <- popNames[i];
                    curInd <- as.numeric( unlist( strsplit( nodeNames[i], split = '.', fixed = T ) )[1] );
                    curChildren <- getChildren( gh, curPop );
                    if ( length( curChildren ) > 0 ){
                        prjlist <- lapply( curChildren, function( curChild ){
                            g <- getGate( gh, curChild );
                            if ( ! flowWorkspace:::.isBoolGate( gh, curChild ) ){
                                param <- parameters( g );

                                if ( length( param ) == 1 ){
                                    param <- c( param, 'SSC-A' );
                                }
                                return( param );
                            } else {
                                return( NULL );
                            }
                        });
                        prj <- do.call( rbind, prjlist );
                        prj <- unique( prj );
                    } else {

                        g <- getGate( gh, curPop );
                        if ( ! flowWorkspace:::.isBoolGate( gh, curPop ) ){
                            prj <- as.list( c( ' ', ' ' ) );
                        }
                    }
                    if ( exists('prj') ){
                        prj <- as.data.frame( prj );
                        colnames(prj) <- c('x_axis', 'y_axis');
                        cbind( index = curInd, path = curPop, prj, gsid = gsid );
                    }
                });

                toInsert <- do.call( rbind, res );

                map <- subset( pData( parameters( getData( gh ) ) )[ , 1:2 ], ! is.na(desc) );

                colnames(map)[1] <- 'x_axis';
                toInsert <- merge( toInsert, map, all.x = T );
                emptyInds <- is.na( toInsert$desc );
                toInsert$desc[ emptyInds ] <- '';
                toInsert$desc[ ! emptyInds ] <- paste( toInsert$desc[ ! emptyInds ], '' );
                toInsert$x_key <- toInsert$x_axis;
                toInsert$x_axis <- paste0( toInsert$desc, toInsert$x_axis );
                toInsert$desc <- NULL;

                colnames(map)[1] <- 'y_axis';
                toInsert <- merge( toInsert, map, all.x = T );
                emptyInds <- is.na( toInsert$desc );
                toInsert$desc[ emptyInds ] <- '';
                toInsert$desc[ ! emptyInds ] <- paste( toInsert$desc[ ! emptyInds ], '' );
                toInsert$y_key <- toInsert$y_axis;
                toInsert$y_axis <- paste0( toInsert$desc, toInsert$y_axis );
                toInsert$desc <- NULL;

                labkey.insertRows( queryName = 'projections', toInsert = toInsert, ... );
            };

            toInsert <- data.frame(
                  gsname            = analysisName
                , gspath            = gatingSetPath
                , gsdescription     = analysisDescription
                , xmlpaths          = strngWorkspacePaths
                , samplegroups      = strngSampleGroupNames
            );

            insertedRow <- labkey.insertRows(
                  toInsert      = toInsert
                , queryName     = 'gstbl'
                , schemaName    = 'opencyto_preprocessing'
                , folderPath    = labkey.url.path
                , baseUrl       = labkey.url.base
            );

            gsid        <- insertedRow$rows[[1]]$gsid;
            container   <- insertedRow$rows[[1]]$container;

            writeProjections(
                  G
                , gsid
                , schemaName    = 'opencyto_preprocessing'
                , folderPath    = labkey.url.path
                , baseUrl       = labkey.url.base
            );

            if ( strngStudyVars != '' ){
                toInsert <- data.frame(
                      svname  = unlist( strsplit( strngStudyVars, split = ',' ) )
                    , gsid    = gsid
                );

                labkey.insertRows(
                      toInsert      = toInsert
                    , queryName     = 'study_vars'
                    , schemaName    = 'opencyto_preprocessing'
                    , folderPath    = labkey.url.path
                    , baseUrl       = labkey.url.base
                );
            }

            if ( strngFilesIds != '' ){
                toInsert <- data.frame(
                      fileid    = unlist( strsplit( strngFilesIds, split = ';' ) )
                    , gsid      = gsid
                );

                labkey.insertRows(
                      toInsert      = toInsert
                    , queryName     = 'files'
                    , schemaName    = 'opencyto_preprocessing'
                    , folderPath    = labkey.url.path
                    , baseUrl       = labkey.url.base
                );
            }

            tempTime <- proc.time() - ptm;
            print( tempTime );
            lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

            txt <- paste( txt, 'and wrote to the db!' );

            unlink( paste0( gatingSetPath, '/FOLDER_LOCKED_TEMP' ), force = T, recursive = T );
        }

    } else {
        txt <- 'Empty path or sample group';
    }

    write( txt, file='${txtout:textOutput}' );

}, error = function(e){

    if ( exists( 'gsid' ) & exists( 'container' ) ){
        if ( length( gsid ) > 0 & length( container ) ){
            if ( ! is.na( gsid ) & ! is.na( container ) ){

                deletedRows <- labkey.deleteRows(
                    toDelete        = data.frame(
                                          gsid        = gsid,
                                          container   = container
                                      )
                    , queryName     = 'gstbl'
                    , baseUrl       = labkey.url.base
                    , folderPath    = labkey.url.path
                    , schemaName    = 'opencyto_preprocessing'
                );

            }
        }
    }

    if ( exists('gatingSetPath') ){
        if ( length( list.files( gatingSetPath, pattern = 'FOLDER_LOCKED_TEMP' ) ) == 1 ){
            unlink( gatingSetPath, force = T, recursive = T );
        }
    }

    if ( exists('xmlFilesParentPath') & exists('xmlPathArray') ){
        fileConn <- file( paste0( xmlFilesParentPath,'/', Sys.time(), '_', paste( basename( xmlPathArray ), collapse = ','), '_', strngSampleGroupNames, '.log' ) );
    }
    lg <- paste0( lg, '\n', print( e ) );

    if (    grepl( 'duplicate key value violates unique constraint', print( e ), fixed = T ) |
            grepl( strngDuplicateAnalysisName, print( e ), fixed = T )
        ){
        close( fileConn );
        stop( strngDuplicateAnalysisName );
    } else {
        if ( exists('fileConn') ){
            write( lg, file = fileConn );
            close( fileConn );
        }
        stop(e);
    }
});
