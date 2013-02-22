print( 'LOADING LIBRARIES ETC.' );
ptm <- proc.time();

suppressMessages( library(flowWorkspace) );
suppressMessages( library(ncdfFlow) );
suppressMessages( library(Rlabkey) );
suppressMessages( library(digest) );

xmlPath             <- labkey.url.params$xmlPath;
filesPath           <- labkey.url.params$rootPath;
sampleGroupName     <- labkey.url.params$sampleGroupName;
analysisName        <- labkey.url.params$analysisName;
analysisDescription <- labkey.url.params$analysisDescription;
studyVarsString     <- labkey.url.params$studyVars;
allStudyVarsString  <- labkey.url.params$allStudyVars;
filesString         <- labkey.url.params$files;

if ( xmlPath != '' & sampleGroupName != '' ){

    folderPath <- dirname( xmlPath );
    if ( filesPath == '' ){
        filesPath <- folderPath;
    }

    currentHashValue <- digest( paste( xmlPath, sampleGroupName, filesString, sep = '' ) );

    gatingSetPath <- paste( folderPath, '/', currentHashValue, '.tar', sep = '' );

    if ( ! file.exists( gatingSetPath ) ) {
    
        suppressMessages( ws <- openWorkspace( xmlPath ) );

        print( proc.time() - ptm );

        print('PARSING WORKSPACE');
        ptm <- proc.time();

        filesArray <- unlist( strsplit( filesString, split=';' ) );

        suppressMessages(
            G <- parseWorkspace(
                  ws
                , name      = sampleGroupName
                , isNcdf    = T
                , path      = filesPath
                , subset    = filesArray
            )
        );

        # need a flag specifying whether meta data is there or not!

        print( proc.time() - ptm );

        print('FETCHING METADATA ETC.');
        ptm <- proc.time();

        if ( allStudyVarsString != '' ){

            meta <- labkey.selectRows(
                  baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'flow'
                , queryName     = 'Files'
                , colSelect     = c('Name', allStudyVarsString) # needs to be a vector of comma separated strings
                , colNameOpt    = 'fieldname'
                , colFilter     = makeFilter( c("Name", "IN", filesString) )
            );
            colnames(meta)[1] <- 'name';

            pData(G) <- meta;

        }

        suppressMessages( archive( G, gatingSetPath ) );
        if ( ! file.exists( gatingSetPath ) ) {
            txt <- 'BAD ERROR: PROBABLY R COULD NOT CREATE THE TAR FILE BECAUSE THERE WAS NOT ENOUGH MEMORY AVAILABLE';
            stop('BAD ERROR: PROBABLY R COULD NOT CREATE THE TAR FILE BECAUSE THERE WAS NOT ENOUGH MEMORY AVAILABLE');
            return;
        } else {

            writeProjections <- function( G, gsId, ... ){
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
                        });
                        prj <- do.call( rbind, prjlist );
                        prj <- unique( prj );
                        prj <- as.data.frame( prj );

                        colnames(prj) <- c('x_axis', 'y_axis');

                        cbind( name = curpNode, path = curPop, prj, gsid = gsId );
                    } else {
                        # print( 'not yet implemented' );
                    }
                });

                toInsert <- do.call( rbind, res );
                insertedRow <- labkey.insertRows( queryName = 'projections', toInsert = toInsert, ... );
            };

            sql <- 'SELECT MAX(gsid) AS max_gsid FROM gstbl';

            max_gsid <- labkey.executeSql(
                  sql           = sql
                , showHidden    = TRUE
                , colNameOpt    = 'caption'
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'opencyto_preprocessing'
            )[1,];

            if ( is.na(max_gsid) ){
                max_gsid <- 0;
            } else {
                max_gsid <- max_gsid + 1;
            }

            toInsert <- data.frame(
                  gsid            = max_gsid
                , gsname          = analysisName
                , objlink         = gatingSetPath
                , gsdescription   = analysisDescription
                , xmlpath         = xmlPath
                , samplegroup     = sampleGroupName
            );

            print( proc.time() - ptm );

            print('WRITING GATING SET');
            ptm <- proc.time();

            test <- labkey.selectRows(
                  queryName     = 'gstbl',
                , baseUrl       = labkey.url.base,
                , folderPath    = labkey.url.path,
                , schemaName    = 'opencyto_preprocessing'
            );

            insertedRow <- labkey.insertRows(
                  queryName     = 'gstbl'
                , toInsert      = toInsert
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'opencyto_preprocessing'
            );

            print( proc.time() - ptm );

            print('WRITING PROJECTIONS AND STUDY VARIABLES');
            ptm <- proc.time();

            writeProjections(
                  G
                , max_gsid
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'opencyto_preprocessing'
            );

            toInsert <- data.frame(
                  svname  = unlist( strsplit( studyVarsString, split=',' ) )
                , gsid    = max_gsid
            );

            labkey.insertRows(
                  queryName     = 'study_vars'
                , toInsert      = toInsert
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'opencyto_preprocessing'
            );

            print( proc.time() - ptm );

            txt <- 'hopefully generated the *.tar file and wrote to the db!';
        }
    } else {
        txt <- 'file already exists';
    }

} else {
    txt <- 'empty path or sample group';
}

write(txt, file='${txtout:textOutput}');
