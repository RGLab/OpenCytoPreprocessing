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

if ( exists('max_gsid') ){
    rm(max_gsid);
}

xmlPathsString      <- labkey.url.params$xmlPath;
filesPath           <- labkey.url.params$rootPath;
sampleGroupNames    <- labkey.url.params$sampleGroupName;
analysisName        <- labkey.url.params$analysisName;
analysisDescription <- labkey.url.params$analysisDescription;
studyVarsString     <- labkey.url.params$studyVars;
allStudyVarsString  <- labkey.url.params$allStudyVars;
filesIdsString      <- labkey.url.params$filesIds;
filesNamesString    <- labkey.url.params$filesNames;

tryCatch({

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

if ( xmlPathsString != '' | sampleGroupNames != '' ){

    xmlPathArray <- unlist( strsplit( xmlPathsString, split = ',' ) );
    if ( length(xmlPathArray) > 1 ){
        folderPath <- getLongestSubstring( SuffixTree( dirname( xmlPathArray ) ) );
    } else {
        folderPath <- dirname( xmlPathArray );
    }

    if ( filesPath == '' ){
        filesPath <- folderPath;
    }

    currentHashValue <- digest( paste0( xmlPathsString, sampleGroupNames, filesIdsString ) );
    gatingSetPath <- paste0( folderPath, '/', currentHashValue );

    if ( ! file.exists( gatingSetPath ) ) {
        filesNamesList <- unlist( strsplit( filesNamesString, split = ',' ) );
        sampleGroupNameArray <- unlist( strsplit( sampleGroupNames, split = ',' ) );

        tempTime <- proc.time() - ptm;
        print( tempTime );
        lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

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

            tempCdfFile <- tempfile(
                pattern = 'ncfs',
                tmpdir  = folderPath,
                fileext = '.nc'
            );
            # to make sure the temp ncdf file is created in the same partition,
            # where it will be saved later to be able to link

            suppressMessages(
                G <- parseWorkspace(
                      ws
                    , name      = sampleGroupNameArray[i]
                    , isNcdf    = T
                    , path      = filesPath
                    , subset    = filesNamesList
                    , ncdfFile  = tempCdfFile
                )
            );

            if ( ( ! exists('G') ) | is.null( G[[1]] ) ){
                txt <- 'The selected sample group does not contain any of the selected files';
                stop('The selected sample group does not contain any of the selected files');
                return;
            }

            tempTime <- proc.time() - ptm;
            print( tempTime );
            lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

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

        print('FETCHING METADATA ETC.');
        lg <- paste0( lg, '\nFETCHING METADATA ETC.' );
        ptm <- proc.time();

        meta <- labkey.selectRows(
              queryName     = 'Files'
            , schemaName    = 'flow'
            , folderPath    = labkey.url.path
            , baseUrl       = labkey.url.base
            , colSelect     = c('Name', allStudyVarsString) # needs to be a vector of comma separated strings
            , colNameOpt    = 'fieldname'
            , colFilter     = makeFilter( c( 'RowId', 'IN', filesIdsString ) )
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

        suppressMessages( save_gslist( G, path = gatingSetPath, overwrite = T, cdf = 'move' ) );

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
    } else {

        tempTime <- proc.time() - ptm;
        print( tempTime );
        lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

        print('UNARCHIVING THE EXISTING DATA');
        lg <- paste0( lg, '\nUNARCHIVING THE EXISTING DATA' );
        ptm <- proc.time();

        suppressMessages( G <- load_gslist( gatingSetPath ) );

        tempTime <- proc.time() - ptm;
        print( tempTime );
        lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

        txt <- 'Success: reusing the already existing data on disk';
    }

        print('WRITING GATING SET');
        lg <- paste0( lg, '\nWRITING GATING SET' );
        ptm <- proc.time();

        sql <- 'SELECT MAX(gsid) AS max_gsid FROM gstbl';

        max_gsid <- labkey.executeSql(
              sql           = sql
            , schemaName    = 'opencyto_preprocessing'
            , folderPath    = labkey.url.path
            , baseUrl       = labkey.url.base
            , showHidden    = T
            , colNameOpt    = 'caption'
        )[1,];

        if ( is.na(max_gsid) ){
            max_gsid <- 1;
        } else {
            max_gsid <- max_gsid + 1;
        }

        toInsert <- data.frame(
              gsid            = max_gsid
            , gsname          = analysisName
            , objlink         = gatingSetPath
            , gsdescription   = analysisDescription
            , xmlpath         = xmlPathsString
            , samplegroup     = sampleGroupNames
        );

        insertedRow <- labkey.insertRows(
              toInsert      = toInsert
            , queryName     = 'gstbl'
            , schemaName    = 'opencyto_preprocessing'
            , folderPath    = labkey.url.path
            , baseUrl       = labkey.url.base
        );

        tempTime <- proc.time() - ptm;
        print( tempTime );
        lg <- paste0( lg, '\n', paste( capture.output( tempTime ), collapse = '\n' ) );

        print('GENERATING PROJECTIONS, WRITING PROJECTIONS, STUDY VARIABLES, AND FILES');
        lg <- paste0( lg, '\nGENERATING PROJECTIONS, WRITING PROJECTIONS, STUDY VARIABLES AND FILES' );
        ptm <- proc.time();

        writeProjections <- function( G, gsId, ... ){
            gh <- G[[1]];
            popNames <- getNodes( gh, isPath = T );
            nodeNames <- getNodes( gh );
            res <- lapply( 1:length(nodeNames), function(i){
                curPop <- popNames[i];
                curpNode <- nodeNames[i];
                curChildren <- getChildren( gh, curpNode );
                if ( length( curChildren ) > 0 ){
                    prjlist <- lapply( curChildren, function(curChild){
                        g <- getGate( gh, curChild );
                        if ( class( g ) != 'BooleanGate' ){
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

                    g <- getGate( gh, curpNode );
                    if ( class( g ) != 'BooleanGate' ){
                        prj <- as.list( c( ' ', ' ' ) );
                    }
                }
                if ( exists('prj') ){
                    prj <- as.data.frame( prj );
                    colnames(prj) <- c('x_axis', 'y_axis');
                    cbind( name = curpNode, path = curPop, prj, gsid = gsId );
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

            insertedRow <- labkey.insertRows( queryName = 'projections', toInsert = toInsert, ... );
        };

        writeProjections(
              G
            , max_gsid
            , schemaName    = 'opencyto_preprocessing'
            , folderPath    = labkey.url.path
            , baseUrl       = labkey.url.base
        );

        if ( studyVarsString != '' ){
            toInsert <- data.frame(
                  svname  = unlist( strsplit( studyVarsString, split = ',' ) )
                , gsid    = max_gsid
            );

            insertedRows <- labkey.insertRows(
                  toInsert      = toInsert
                , queryName     = 'study_vars'
                , schemaName    = 'opencyto_preprocessing'
                , folderPath    = labkey.url.path
                , baseUrl       = labkey.url.base
            );
        }

        if ( filesIdsString != '' ){
            toInsert <- data.frame(
                  fileid    = unlist( strsplit( filesIdsString, split = ';' ) )
                , gsid      = max_gsid
            );

            insertedRows <- labkey.insertRows(
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

} else {
    txt <- 'Empty path or sample group';
}

write( txt, file='${txtout:textOutput}' );

}, error = function(e){
    if ( exists('max_gsid') ){
        if ( ! is.na(max_gsid) ){
            write( toJSON( c( max_gsid ) ), '${jsonout:outArray}' );
        }
    }

    unlink( paste0( folderPath, '/ncfs*.nc' ), force = T, recursive = T );

    fileConn <- file( paste0( folderPath,'/', Sys.time(), '_', paste( basename( xmlPathArray ), collapse = ','), '_', sampleGroupNames, '.log' ) );
    lg <- paste0( lg, '\n', print( e ) );
    write( lg, file = fileConn );
    close( fileConn );
    stop(e);
});

