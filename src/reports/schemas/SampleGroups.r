suppressMessages( library(flowWorkspace) );

path <- labkey.url.params$path;

if ( path != '' ){

    suppressMessages( ws <- openWorkspace( path ) );
    txt <- paste( unique( getSampleGroups(ws)[[1]]  ), collapse=';' );
}

write(txt, file='${txtout:textOutput}');
