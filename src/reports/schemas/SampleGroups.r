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

suppressMessages( library( flowWorkspace ) );
suppressMessages( library( RJSONIO ) );
suppressMessages( library( gdata ) );

wsPath <- labkey.url.params$wsPath;

if ( wsPath != '' ){

    suppressMessages( ws <- openWorkspace( wsPath, options = 1 ) );

    sampleGroups <- getSampleGroups(ws)[ , c(1,3) ];

    list <- as.character( unique( sampleGroups[[1]] ) );

    if ( length(list) > 1 ){
        list <- list[ list != 'All Samples' ];

        sampleGroups <- sampleGroups[ sampleGroups$groupName != 'All Samples', ];

        sampleGroups$groupName <- drop.levels( sampleGroups$groupName );
    }

    sampleGroups <-
        cbind(
            sampleGroups,
            filename = sapply(
                sampleGroups$sampleID,
                function(x) flowWorkspace:::.getKeywordsBySampleID( ws, x, '$FIL' )
            )
        );
    sampleGroups <- sampleGroups[ , c(1,3) ];

    sampleGroups <- split( sampleGroups$filename, sampleGroups$groupName );

    write( toJSON( list ), '${jsonout:outArray}' );
    write( toJSON( sampleGroups ), '${jsonout:outArray}' );
}

