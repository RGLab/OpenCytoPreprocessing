suppressMessages( library( flowWorkspace ) );
suppressMessages( library( RJSONIO ) );

wsPath <- labkey.url.params$wsPath;

if ( wsPath != '' ){

    suppressMessages( ws <- openWorkspace( wsPath ) );

    sampleGroups <- getSampleGroups(ws)[ , c(1,3) ];

    list <- unique( sampleGroups[[1]] );

    sampleGroups <-
        cbind(
            sampleGroups,
            filename = sapply(
                sampleGroups$sampleID,
                function(x) flowWorkspace:::.getKeywordsBySampleID( ws, x, "$FIL" )
            )
        );
    sampleGroups <- sampleGroups[ , c(1,3) ];

    sampleGroups <- split( sampleGroups$filename, sampleGroups$groupName );

    write( toJSON( list ), '${jsonout:outArray}' );
    write( toJSON( sampleGroups ), '${jsonout:outArray}' );
}
