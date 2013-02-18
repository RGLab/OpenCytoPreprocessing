// vim: sw=4:ts=4:nu:nospell:fdc=4
/*
 *  Copyright 2012 Fred Hutchinson Cancer Research Center
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

Ext.namespace('LABKEY', 'LABKEY.ext');

LABKEY.ext.OpenCytoPreprocessing = Ext.extend( Ext.Panel, {

    constructor : function(config) {

        this.addEvents({
            'preprocessed' : true
        });

        ////////////////////////////////////
        //  Generate necessary HTML divs  //
        ////////////////////////////////////
        $('#' + config.webPartDivId).append(
            '<div id="wpNcdf' + config.webPartDivId + '" class="centered-text"></div>'

          + '<div id="wpSampleGroupsFetching' + config.webPartDivId + '" class="centered-text hidden"></div>'

          + '<div id="wpParse' + config.webPartDivId + '" class="centered-text"></div>'

          + '<ul id="ulList' + config.webPartDivId + '" class="bold-text ulList">'

              + '<li class="liListDefault">'
                  + '<div class="left-text" id="pnlXml' + config.webPartDivId + '"></div>' +
                '</li>'

              + '<li class="liListDefault">'
                  + '<div class="left-text" id="pnlSampleGroup' + config.webPartDivId + '"></div>' +
                '</li>'

              + '<li class="liListDefault">'
                  + '<div class="left-text" id="pnlAnalysisName' + config.webPartDivId + '"></div>' +
                '</li>'

              + '<li class="liListDefault">'
                  + '<div class="left-text" id="pnlAnalysisDescription' + config.webPartDivId + '"></div>' +
                '</li>' +

            '</ul>'
        );


        /////////////////////////////////////
        //            Variables            //
        /////////////////////////////////////
        var
              pnlGlobal         = this
            , rootPath          = undefined
            , maskGlobal        = undefined
            , selectedStudyVars = undefined
            , notSorting        = undefined
            , listStudyVars     = []
            ;

        /////////////////////////////////////
        //             Strings             //
        /////////////////////////////////////
        var strngErrorContactWithLink = ' Please, contact the <a href="mailto:ldashevs@fhcrc.org?Subject=OpenCytoPreprocessing%20Support">developer</a>, if you have questions.'


        /////////////////////////////////////
        //            Close Tool           //
        /////////////////////////////////////
        var closeTool = [{
            id: 'close',
            handler: function(e, target, pnl){
                var toRemove = document.getElementById( pnl.getId() ).parentNode.parentNode;
                toRemove.parentNode.removeChild( toRemove );
            }
        }];


        ///////////////////////////////////
        //            Stores             //
        ///////////////////////////////////
        var strSampleGroup = new Ext.data.ArrayStore({
            autoLoad: false,
            data: [],
            fields: [{ name: 'SampleGroup', type: 'string' }]
        });

        var strXML = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                load: function(){
                    if ( this.getCount() == 0 ){
                        cbXml.disable();
                        tfAnalysisName.disable();
                        pnlWorkspaces.getEl().mask('Seems like you have not imported any XML files, click <a href="' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '">here</a> to do so.' + strngErrorContactWithLink, 'infoMask');
                    }
                }
            },
            queryName: 'XmlFiles',
            remoteSort: false,
            schemaName: 'exp',
            sort: 'FileName'
        });

        var strngSqlStartTable = 'SELECT DISTINCT FCSFiles.Name AS FileName';
        var strngSqlEndTable =
            ' FROM FCSFiles' +
            ' WHERE FCSFiles.Run.FCSFileCount != 0 AND FCSFiles.Run.ProtocolStep = \'Keywords\'' +
            ' ORDER BY FileName';

        var strFilteredTable = new LABKEY.ext.Store({
            listeners: {
                load: function(){
                    if ( notSorting ){
                        pnlTable.getSelectionModel().selectAll();

                        notSorting = false;
                    }

                    updateTableStatus();
                }
            },
//                    nullRecord: {
//                        displayColumn: 'myDisplayColumn',
//                        nullCaption: '0'
//                    },
            schemaName: 'flow',
            sql: strngSqlStartTable + strngSqlEndTable
        });

        var strStudyVarName = new Ext.data.ArrayStore({
            data: [],
            fields: ['Flag', 'Display', 'Value'],
            sortInfo: {
                field: 'Flag',
                direction: 'ASC'
            }
        });


        //////////////////////////////////////////////////////////////////
        //             Queries and associated functionality             //
        //////////////////////////////////////////////////////////////////
        LABKEY.Query.selectRows({
            columns: ['RootPath'],
            failure: onFailure,
            queryName: 'RootPath',
            schemaName: 'flow',
            success: function(data){
                var count = data.rowCount;
                if ( count == 1 ){
                    rootPath = data.rows[0].RootPath;
                } else if ( count < 1 ){
                    // disable all
                    btnNext.disable();
                    cbStudyVarName.disable();
                    pnlMain.getEl().mask('Seems like you have not imported any FCS files, click <a href="' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '">here</a> to do so.' + strngErrorContactWithLink, 'infoMask');
                } else {
                    // disable all
                    btnNext.disable();
                    cbStudyVarName.disable();
                    pnlMain.getEl().mask('Cannot retrieve the path for the data files: it is non-unique.' + strngErrorContactWithLink, 'infoMask');
                }
            }
        });

        LABKEY.Query.getQueries({
            schemaName: 'Samples',
            success: function( queriesInfo ){
                var queries = queriesInfo.queries, count = queries.length, j;
                for ( j = 0; j < count; j ++ ){
                    if ( queries[j].name == 'Samples' ){
                        j = count;
                    }
                }

                if ( j == count + 1 ){
                    LABKEY.Domain.get(
                        function( DomainDesign ) {
                            var toAdd;
                            Ext.each(
                                DomainDesign.fields,
                                function( r ){
                                    toAdd = r.name;
                                    listStudyVars.push( [ 'E', toAdd + ' (External)', 'Sample/' + toAdd ] );
                                }
                            );

                            fetchKeywords();
                        },
                        fetchKeywords,
                        'Samples',
                        'Samples'
                    );
                } else {
                    fetchKeywords();
                }
            },
            failure: fetchKeywords
        });

        function fetchKeywords(){
            LABKEY.Query.selectRows({
                columns: ['Name'],
                filterArray: [
                    LABKEY.Filter.create( 'Name', 'DISPLAY;BS;MS', LABKEY.Filter.Types.CONTAINS_NONE_OF ),
                    LABKEY.Filter.create(
                        'Name',
                        [ '$', 'LASER', 'EXPORT', 'CST', 'CYTOMETER', 'EXPORT',
                          'FJ_', 'CREATOR', 'TUBE NAME', 'WINDOW EXTENSION', 'SPILL' ],
                        LABKEY.Filter.Types.DOES_NOT_START_WITH
                    )
                ],
                queryName: 'Keyword',
                schemaName: 'flow',
                success:
                        function(data){
                            var toAdd;
                            Ext.each(
                                    data.rows,
                                    function( r ){
                                        toAdd = r.Name;
                                        listStudyVars.push( [ 'K', toAdd + ' (Keyword)', 'RowId/Keyword/' + toAdd ] );
                                    }
                            );

                            strStudyVarName.loadData( listStudyVars );
                        },
                failure: onFailure
            });
        }


        /////////////////////////////////////
        //     ComboBoxes / TextFields     //
        /////////////////////////////////////
        var cbStudyVarName = new Ext.ux.form.SuperBoxSelect({
            allowBlank: true,
            autoSelect: false,
            displayField: 'Display',
            emptyText: 'Select...',
            forceSelection: true,
            getAllValuesAsArray: function(){
                var c = [];

                Ext.each( this.store.data.items, function(r){ c.push( r.data.Value ); } );

                Ext.each( this.usedRecords.items, function(r){ c.push( r.data.Value ); } );

                return c;
            },
            lazyInit: false,
            listeners: {
                additem: function(){
                    updateInfoStatus( 'Set the study variables and click \'Next\'', 1 );
                },
                clear: function(){
                    updateInfoStatus( 'Set the study variables and click \'Next\'' );
                },
                /*focus: function (){ // display the dropdown on focus
                    this.expand();
                },*/
                removeitem: function(){
                    updateInfoStatus( 'Set the study variables and click \'Next\'', 1 );
                }
            },
            minChars: 0,
            mode: 'local',
            resizable: true,
            store: strStudyVarName,
            supressClearValueRemoveEvents : true,
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'Value'
        });

        var lastlySelectedXML = undefined;

        var cbXml = new Ext.form.ClearableComboBox({
            allowBlank: true,
            displayField: 'FileName',
            emptyText: 'Select...',
            forceSelection: true,
            listeners: {
                change: function(){
                    // sample groups obtaining logic here?
                    if ( this.getValue() == '' ){
                        cbSampleGroup.setDisabled(true);
                        btnProcess.setDisabled(true);

                        this.focus();
                    } else {
                        cbSampleGroup.setDisabled(false);

                        if ( cbSampleGroup.getValue() != '' ){
                            btnProcess.setDisabled(false);

                            tfAnalysisName.focus(); // working?
                        } else {
                            cbSampleGroup.focus(); // working?
                        }
                    }
                },
                cleared: function(){
                    cbSampleGroup.setDisabled(true);
                    btnProcess.setDisabled(true);

                    this.focus();
                },
                select: function(c, r, i){
                    var value = this.getValue();

                    if ( value != lastlySelectedXML ){

                        maskGlobal.msg = 'Obtaining the available sample groups, please, wait...';
                        maskGlobal.show();

                        this.setDisabled(true); // to prevent interaction with that combo while the mask is on
                        tfAnalysisName.setDisabled(true); // to prevent interaction with that combo while the mask is on
                        tfAnalysisDescription.setDisabled(true); // to prevent interaction with that combo while the mask is on
                        // do we need to also disable the navigation buttons ?

                        // when we have an example with multiple xml workspaces, then probably need to clear out the cbSampleGroup ('s store)

                        wpSampleGroupsFetchingConfig.path = decodeURI( value ).slice(5);

                        wpSampleGroupsFetching.render();
                    } else {
                        cbSampleGroup.setDisabled(false);

                        if ( cbSampleGroup.getValue() != '' ){
                            btnProcess.setDisabled(false);

                            this.triggerBlur();

                            tfAnalysisName.focus();
                        } else {
                            this.triggerBlur();

                            cbSampleGroup.focus();
                        }
                    }
                }
            },
            minChars: 0,
            mode: 'local',
            store: strXML,
            tpl: '<tpl for="."><div class="x-combo-list-item">{FileName:htmlEncode}</div></tpl>',
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'FilePath',
            width: 200
        });

        var cbSampleGroup = new Ext.form.ClearableComboBox({
            allowBlank: true,
            disabled: true,
            displayField: 'SampleGroup',
            emptyText: 'Select...',
            forceSelection: true,
            listeners: {
                change: function(){
                    if ( this.getValue() != '' ){
                        btnProcess.setDisabled(false);

                        tfAnalysisName.focus(); // working?
                    } else {
                        btnProcess.setDisabled(true);

                        this.focus();
                    }
                },
                cleared: function(){
                    btnProcess.setDisabled(true);

                    this.focus();
                },
                select: function(){
                   btnProcess.setDisabled(false);

                   this.triggerBlur();

                   tfAnalysisName.focus();
                }
            },
            minChars: 0,
            mode: 'local',
            store: strSampleGroup,
            tpl: '<tpl for="."><div class="x-combo-list-item">{SampleGroup:htmlEncode}</div></tpl>',
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'SampleGroup',
            width: 200
        });

        strSampleGroup.on({
                'load': function(){
                    cbSampleGroup.focus();
                    cbSampleGroup.expand();
                }
        });

        var tfAnalysisName = new Ext.form.TextField({
            allowBlank: true,
            emptyText: 'Type...',
            width: 200
        });

        var tfAnalysisDescription = new Ext.form.TextField({
            allowBlank: true,
            emptyText: 'Type...',
            width: 200
        });


        /////////////////////////////////////
        //             Buttons             //
        /////////////////////////////////////
        var btnProcess = new Ext.Button({
            disabled: true,
            handler: function(){
                if ( tfAnalysisName.getValue() == '' ){
                    updateInfoStatus( 'Empty analysis name is not allowed', -1 );

                    tfAnalysisName.focus();
                    tfAnalysisName.getEl().frame( "ff0000", 1, { duration: 3 } );
                } else if ( tfAnalysisDescription.getValue() == '' ){
                    updateInfoStatus( 'Empty analysis description is not allowed', -1 );

                    tfAnalysisDescription.focus();
                    tfAnalysisDescription.getEl().frame( "ff0000", 1, { duration: 3 } );
                } else {
                    if ( cbSampleGroup.getValue() != '' ){
                        this.setDisabled(true);
                        cbXml.setDisabled(true);
                        cbSampleGroup.setDisabled(true);
                        tfAnalysisName.setDisabled(true);
                        tfAnalysisDescription.setDisabled(true);

                        maskGlobal.msg = 'Generating and saving the analysis data, please, wait...';
                        maskGlobal.show();

                        var records = pnlTable.getSelectionModel().getSelections(), files = [];
                        Ext.each( records, function( record ){ files.push( record.data.FileName ); } );
                        wpParseConfig.files                 = files.join(';');

                        wpParseConfig.xmlPath               = wpSampleGroupsFetchingConfig.path;
                        wpParseConfig.sampleGroupName       = cbSampleGroup.getValue();
                        wpParseConfig.analysisName          = tfAnalysisName.getValue();
                        wpParseConfig.analysisDescription   = tfAnalysisDescription.getValue();
                        wpParseConfig.studyVars             = cbStudyVarName.getValue();
                        wpParseConfig.allStudyVars          = cbStudyVarName.getAllValuesAsArray().join();
                        wpParseConfig.rootPath              = Ext.util.Format.undef(rootPath);

                        wpParse.render();
                    }
                }
            },
            text: 'Process'
        });

        var btnBack = new Ext.Button({
            disabled: true,
            text: '< Back'
        });

        var btnNext = new Ext.Button({
            text: 'Next >'
        });

        /////////////////////////////////////
        //             Web parts           //
        /////////////////////////////////////
        var wpSampleGroupsFetchingConfig = {
            reportId: 'module:OpenCytoPreprocessing/SampleGroups.r',
//            showSection: 'textOutput', // comment out to show debug output
            title: 'HiddenDiv'
        };

        var wpSampleGroupsFetching = new LABKEY.WebPart({
            failure: function( errorInfo, options, responseObj ){
                maskGlobal.hide();

                cbXml.setDisabled(false);
                tfAnalysisName.setDisabled(false);
                tfAnalysisDescription.setDisabled(false);

                onFailure(errorInfo, options, responseObj);
            },
            frame: 'none',
            partConfig: wpSampleGroupsFetchingConfig,
            partName: 'Report',
            renderTo: 'wpSampleGroupsFetching' + config.webPartDivId,
            success: function(){
                maskGlobal.hide();

                cbXml.setDisabled(false);
                tfAnalysisName.setDisabled(false);
                tfAnalysisDescription.setDisabled(false);

                var inputArray = $('#wpSampleGroupsFetching' + config.webPartDivId + ' pre')[0].innerHTML;
                if ( inputArray.search('java.lang.RuntimeException') < 0 ){
                    if ( inputArray.search('javax.script.ScriptException') < 0 ){
                        cbSampleGroup.setDisabled(false);
                        inputArray = inputArray.replace(/\n/g, '').replace('All Samples;', '').split(';');

                        var len = inputArray.length;
                        for ( var i = 0; i < len; i ++ ){
                            inputArray[i] = [ inputArray[i] ];
                        }

                        strSampleGroup.loadData(inputArray);

                        lastlySelectedXML = cbXml.getValue();
                    } else {
                        onFailure({
                            exception: inputArray.replace(/Execution halted\n/, 'Execution halted')
                        });
                    }
                } else {
                    onFailure({
                        exception: inputArray
                    });
                }
            }
        });


        var wpParseConfig = {
            reportId: 'module:OpenCytoPreprocessing/OpenCytoPreprocessing.r',
//            showSection: 'textOutput', // comment out to show debug output
            title: 'ParseDiv'
        };

        var wpParse = new LABKEY.WebPart({
            failure: function( errorInfo, options, responseObj ){
                maskGlobal.hide();

                cbXml.setDisabled(false);
                cbSampleGroup.setDisabled(false);
                tfAnalysisName.setDisabled(false);
                tfAnalysisDescription.setDisabled(false);

                btnProcess.setDisabled(false);

                onFailure(errorInfo, options, responseObj);
            },
            frame: 'none',
            partConfig: wpParseConfig,
            partName: 'Report',
            renderTo: 'wpParse' + config.webPartDivId,
            success: function(){
                maskGlobal.hide();

                cbXml.setDisabled(false);
                cbSampleGroup.setDisabled(false);
                tfAnalysisName.setDisabled(false);
                tfAnalysisDescription.setDisabled(false);

                btnProcess.setDisabled(false);

//                var activeIndex = this.items.indexOf( this.getLayout().activeItem ) + direction;
                pnlMain.getLayout().setActiveItem( 1 );

                pnlGlobal.fireEvent( 'preprocessed' );
            }
        });


        /////////////////////////////////////
        //  Panels, Containers, Components //
        /////////////////////////////////////
        var cmpStudyVars = new Ext.Component({
            cls: 'bold-text',
            html: 'Select the study variables that are of interest for this project:'
        });

        var cmpStatus = new Ext.Component({
            html: 'Set the study variables and click \'Next\'',
            style: { paddingLeft: '10px' }
        });

        var pnlStudyVars = new Ext.Panel({
            defaults: {
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            items: [
                cmpStudyVars,
                new Ext.Panel({
                    border: false,
                    items: [ cbStudyVarName ],
                    layout: 'fit'
                })
            ],
            title: 'Configuration'
        });


        new Ext.Panel({
            border: false,
            headerCssClass: 'simple-panel-header',
            items: [ cbXml ],
            layout: 'fit',
            renderTo: 'pnlXml' + config.webPartDivId,
            title: 'Select the workspace:'
        });

        new Ext.Panel({
            border: false,
            headerCssClass: 'simple-panel-header',
            items: [ cbSampleGroup ],
            layout: 'fit',
            renderTo: 'pnlSampleGroup' + config.webPartDivId,
            title: 'Select the sample group:'
        });

        new Ext.Panel({
            border: false,
            headerCssClass: 'simple-panel-header',
            items: [ tfAnalysisName ],
            layout: 'fit',
            renderTo: 'pnlAnalysisName' + config.webPartDivId,
            title: 'Enter analysis name:'
        });

        new Ext.Panel({
            border: false,
            headerCssClass: 'simple-panel-header',
            items: [ tfAnalysisDescription ],
            layout: 'fit',
            renderTo: 'pnlAnalysisDescription' + config.webPartDivId,
            title: 'Enter analysis description:'
        });
        

        var pnlList = new Ext.Panel({
            border: false,
            contentEl: 'ulList' + config.webPartDivId
        });

        var pnlWorkspaces = new Ext.Panel({
            defaults: {
                hideMode: 'visibility', // ? why not offsets ?
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
//                    disabled: true,
            forceLayout: true,
            items: [
                pnlList,
                new Ext.Component({
                    contentEl: 'wpSampleGroupsFetching' + config.webPartDivId
                }),
                new Ext.Component({
                    contentEl: 'wpParse' + config.webPartDivId
                })
            ],
            title: 'Workspaces'
        });


        var smCheckBox = new Ext.grid.CheckboxSelectionModel({
            checkOnly: true,
            listeners: {
                rowdeselect:    updateTableStatus,
                rowselect:      updateTableStatus
            },
            sortable: true
        });

        var rowNumberer = new Ext.grid.RowNumberer();

        var pnlTable = new Ext.grid.GridPanel({
            autoScroll: true,
//        colModel: new Ext.ux.grid.LockingColumnModel([
//            {
//                dataIndex: 'FileName',
//                header: 'File Name',
//                resizable: true,
//                sortable: true
//            }
//        ]),
            columns: [],
            selModel: smCheckBox,
            height: 200,
            loadMask: { msg: 'Loading data...', msgCls: 'x-mask-loading-custom' },
            plugins: ['autosizecolumns', new Ext.ux.plugins.CheckBoxMemory({ idProperty: 'FileName' })],
            store: strFilteredTable,
            stripeRows: true,
            title: 'Files',
//                    view: new Ext.ux.grid.LockingGridView(),
            viewConfig:
            {
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlComp = new Ext.Panel({
            defaults: {
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            items: [],
            title: 'Compensation'
        });


        var pnlMain = new Ext.Panel({
            activeItem: 0,
            autoHeight: true,
            bodyStyle: {
                paddingTop: '3px'
            },
            border: false,
            defaults: {
                autoHeight: true,
                hideMode: 'offsets'
            },
            deferredRender: false,
            forceLayout: true,
            items: [
                pnlStudyVars,
                pnlWorkspaces,
                new Ext.Container({
                    items: [ pnlTable ],
                    layout: 'fit'
                }),
                pnlComp
            ],
            layout: 'card',
            listeners: {
                afterrender: function(){
                    maskGlobal = new Ext.LoadMask( this.getEl(), {msgCls: 'x-mask-loading-custom'} );
                }
            },
            tbar: new Ext.Toolbar({
                items: [ btnProcess, btnBack, btnNext, cmpStatus ]
            })
        });

        btnBack.on( 'click', navHandler.createDelegate( pnlMain, [-1] ) );
        btnNext.on( 'click', navHandler.createDelegate( pnlMain, [1] ) );


        /////////////////////////////////////
        //             Functions           //
        /////////////////////////////////////
        function updateInfoStatus( text, code ){
            cmpStatus.update( text );
            if ( text != '' ){
                if ( code == -1 ){
                    cmpStatus.getEl().setStyle( {color: 'red'} );
                    cmpStatus.getEl().frame( "ff0000", 1, { duration: 3 } ); // RED ERROR
                } else if ( code == 1 ) {
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                }
                else {
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                    cmpStatus.getEl().frame();
                }
            }
        };

        function updateTableStatus(){

            var selectedCount = pnlTable.getSelectionModel().getCount();

            // Update the table's title
            if ( selectedCount == 1 ){
                pnlTable.setTitle( selectedCount + ' file is currently chosen' );
            } else {
                pnlTable.setTitle( selectedCount + ' files are currently chosen' );
            }

            // Manage the 'check all' icon state
            var t = Ext.fly(pnlTable.getView().innerHd).child('.x-grid3-hd-checker');
            var isChecked = t.hasClass('x-grid3-hd-checker-on');
            var totalCount = pnlTable.getStore().getCount();

            if ( selectedCount != totalCount & isChecked ){
                t.removeClass('x-grid3-hd-checker-on');
            } else if ( selectedCount == totalCount & ! isChecked ){
                t.addClass('x-grid3-hd-checker-on');
            }
        };

        function setStudyVars() {
            var temp = cbStudyVarName.getValue();
            if ( temp != selectedStudyVars ){
                selectedStudyVars = temp;

                var i, len, c, curLabel, curValue, curFlag, tempSQL, newColumns;

                // Grab the choices array
                var arrayStudyVars = cbStudyVarName.getValueEx();

                newColumns =
                        [
                            rowNumberer,
                            smCheckBox,
                            {
                                dataIndex: 'FileName',
                                header: 'File Name'
                            }
                        ];
                tempSQL = strngSqlStartTable;

                len = arrayStudyVars.length;

                for ( i = 0; i < len; i ++ ){
                    c = arrayStudyVars[i];
                    curLabel = c.Display; curValue = LABKEY.QueryKey.encodePart( c.Value ); curFlag = curLabel.slice(-2,-1);

                    if ( curFlag == 'l' ){ // External study variable
                        curLabel = curLabel.slice(0, -11);
                        tempSQL += ', FCSFiles.Sample."' + curLabel + '" AS "' + curValue + '"';
                        curLabel += ' (External)';
                    } else if ( curFlag == 'd' ){ // Keyword study variable
                        curLabel = curLabel.slice(0, -10);
                        tempSQL += ', FCSFiles.Keyword."' + curLabel + '" AS "' + curValue + '"';
                        curLabel += ' (Keyword)';
                    } else {
                        i = len;
                        onFailure({
                            exception: 'there was an error while executing this command: data format mismatch.'
                        });
                    }

                    newColumns.push({
                        dataIndex: curValue,
                        header: curLabel
                    });

                } // end of for ( i = 0; i < len; i ++ ) loop

                tempSQL += strngSqlEndTable;

                strFilteredTable.setSql( tempSQL );
                strFilteredTable.load();

                notSorting = true;

                pnlTable.reconfigure(
                        pnlTable.getStore(),
                        new Ext.grid.ColumnModel({
                            columns: newColumns,
                            defaults: {
                                dragable: false,
                                hideable: false,
                                resizable: true,
                                sortable: true,
                                tooltip: 'double click the separator between two column headers to fit the column width to its contents'
                            }
                        })
                );

                if ( cbSampleGroup.getValue() != '' & cbXml.getValue() != '' ){
                    btnProcess.setDisabled(false);
                }
            }
         }; // end of setStudyVars()

        function navHandler(direction){
            var
                oldIndex = this.items.indexOf( this.getLayout().activeItem),
                newIndex = oldIndex + direction;

            this.getLayout().setActiveItem( newIndex );

            if ( newIndex == 0 ){
                btnBack.setDisabled(true);

//                btnProcess.setDisabled(true);
            }

            if ( newIndex == 1 ){
                btnBack.setDisabled(false);

                if ( oldIndex == 0){
                    setStudyVars();
                }
            }

            if ( newIndex == 2 ){ btnNext.setDisabled(false); }

            if ( newIndex == 3 ){ btnNext.setDisabled(true); }

            updateInfoStatus( '' );
        };


        // jQuery-related


        this.border = false;
        this.boxMinWidth = 370; // ?
        this.frame = false;
        this.items = [ pnlMain ];
        this.layout = 'fit';
        this.renderTo = config.webPartDivId;
        this.webPartDivId = config.webPartDivId;
        this.width = document.getElementById(config.webPartDivId).offsetWidth;

        LABKEY.ext.OpenCytoPreprocessing.superclass.constructor.apply(this, arguments);

    }, // end constructor

    resize: function(){
//                webPartContentWidth = document.getElementById(this.webPartDivId).offsetWidth;

//                 if ( typeof resizableImage != 'undefined' ){
//                 if ( $('#resultImage').width() > 2/3*pnlStudyVars.getWidth() ){
//                 resizableImage.resizeTo( 2/3*pnlStudyVars.getWidth(), 2/3*pnlStudyVars.getWidth() );
//                 }
//                 }
    }
}); // end OpenCytoPreprocessing Panel class
