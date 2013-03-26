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

suppressMessages( library( Rlabkey ) );

gsPath      <- labkey.url.params$gsPath;
gsId        <- as.numeric( labkey.url.params$gsId );
entityId    <- labkey.url.params$container;

if ( gsPath != '' ){

    if ( gsId != '' ){

        deletedRows <- labkey.deleteRows(
            toDelete        = data.frame(
								gsid        = gsId,
								container   = entityId
							  )
            , queryName     = 'gstbl'
            , baseUrl       = labkey.url.base
            , folderPath    = labkey.url.path
            , schemaName    = 'opencyto_preprocessing'
        );

        txt <- 'analysis removed from the db';

    }

    gsTbl <- labkey.selectRows(
          queryName     = 'gstbl',
        , schemaName    = 'opencyto_preprocessing'
        , baseUrl       = labkey.url.base
        , folderPath    = labkey.url.path
        , colFilter     = makeFilter( c( 'objlink', 'EQUALS', gsPath ) )
    );

    tryCatch(
        {
            if ( nrow( gsTbl ) == 0 ) {
                res <- unlink( gsPath, force = T, recursive = T );

                if ( res == 0 ){
                    txt <- paste( txt, 'and from the file system' );
                } else {
                    insertedRow <- labkey.insertRows(
                          toInsert      = do.call( rbind, lapply( deletedRows$rows, data.frame ) )
                        , queryName     = 'gstbl'
                        , schemaName    = 'opencyto_preprocessing'
                        , folderPath    = labkey.url.path
                        , baseUrl       = labkey.url.base
                    )
                    stop( 'removal of the analysis from the file system failed: should have reinserted the removed row(s)' );
                }
            } else {
                txt <- paste( txt, '- did not attempt to remove from the file system, since other analyses entries rely on it' );
            }
        },
        error = function(e){
            stop( e );
        }
    )

    write( txt, file='${txtout:textOutput}' );
} else {
    stop( 'Emtpy analysis path provided' );
}

