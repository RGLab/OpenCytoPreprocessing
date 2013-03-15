suppressMessages( library(flowWorkspace) );

path <- labkey.url.params$path;

if ( path != '' ){

    suppressMessages( ws <- openWorkspace( path ) );
    txt <- paste( unique( getSampleGroups(ws)[[1]]  ), collapse=';' );
    # unique(getSampleGroups(ws)[,1:2]); # alternative ?
	print("Test Message printed to Console.");
	
}

#sg<-merge(getSamples(ws),getSampleGroups(ws),by="sampleID")
#sg <- cbind(sg, filename = sapply(sg$sampleID, function(x) flowWorkspace:::.getKeywordsBySampleID(ws, x,"$FIL")))
#subset(sg,groupName=="cell tubes",select="filename")

write(txt, file='${txtout:textOutput}');
