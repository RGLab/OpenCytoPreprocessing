// vim: sw=4:ts=4:nu:nospell:fdc=4
/*
 Copyright 2012 Fred Hutchinson Cancer Research Center

 Licensed under the Apache License, Version 2.0 (the 'License');
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an 'AS IS' BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

Ext.namespace('LABKEY', 'LABKEY.ext');

LABKEY.ext.OpenCytoPreprocessing = Ext.extend( Ext.Panel, {

    constructor : function(config) {

        ////////////////////////////////////
        //  Generate necessary HTML divs  //
        ////////////////////////////////////
        $('#' + config.webPartDivId).append(
            '<div id=\'wpParse' + config.webPartDivId + '\' class=\'centered-text\'></div>'

          + '<ul id=\'ulList' + config.webPartDivId + '\' class=\'bold-text ulList\'>'

              + '<li class=\'liListDefault\'>'
                  + '<div class=\'left-text\' id=\'pnlXml' + config.webPartDivId + '\'></div>' +
                '</li>'

              + '<li class=\'liListDefault\'>'
                  + '<div class=\'left-text\' id=\'pnlSampleGroup' + config.webPartDivId + '\'></div>' +
                '</li>'

              + '<li class=\'liListDefault\'>'
                  + '<div class=\'left-text\' id=\'pnlAnalysisName' + config.webPartDivId + '\'></div>' +
                '</li>'

              + '<li class=\'liListDefault\'>'
                  + '<div class=\'left-text\' id=\'pnlAnalysisDescription' + config.webPartDivId + '\'></div>' +
                '</li>' +

            '</ul>'
        );


        /////////////////////////////////////
        //            Variables            //
        /////////////////////////////////////
        var
            me                          = this,
            reportSessionIdCreate       = undefined,
            reportSessionIdDelete       = undefined,

            maskStudyVars               = undefined,
            maskWorkspaces              = undefined,
            maskFiles                   = undefined,
            maskCompensation            = undefined,
            maskDelete                  = undefined,

            flagCreate                  = undefined,
            flagNotSorting              = undefined,
            flagLoading                 = undefined,

            selectedStudyVars           = undefined,
            selectedXmlAndSampleGroup   = undefined,
            sampleGroupsMap             = undefined,
            fileNameFilter =
                LABKEY.Filter.create(
                    'FileName',
                    '',
                    LABKEY.Filter.Types.IN
                ),
            listStudyVars               = []
            ;


        /////////////////////////////////////
        //             Strings             //
        /////////////////////////////////////
        var strngErrorContactWithLink   = ' Please, contact the <a href=\'mailto:ldashevs@fhcrc.org?Subject=OpenCytoPreprocessing%20Support\'>developer</a>, if you have questions.',
            strngLoadingPhenoData       = 'Loading pheno data for chosen sample group and study variables, please, wait...';


        ///////////////////////////////////
        //            Stores             //
        ///////////////////////////////////
        var strXML = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                load: function(){
                    if ( this.getCount() == 0 ){
                        cbXML.setDisabled(true);
                        tfAnalysisName.setDisabled(true);
                        pnlWorkspaces.getEl().mask('Seems like you have not imported any XML files, click <a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a> to do so.' + strngErrorContactWithLink, 'infoMask');
                    }
                },
                loadexception: onFailure
            },
            queryName: 'XmlFiles',
            remoteSort: false,
            schemaName: 'exp',
            sort: 'FileName'
        });

        var strSampleGroup = new Ext.data.ArrayStore({
            autoLoad: false,
            data: [],
            listeners: {
                exception: onFailure
            },
            fields: [{ name: 'SampleGroup', type: 'string' }]
        });

        var strngSqlStartTable = 'SELECT DISTINCT FCSFiles.Name AS FileName, FCSFiles.RowId AS FileId',
            strngSqlEndTable =
              ' FROM FCSFiles'
            + ' WHERE FCSFiles.Run.FCSFileCount != 0 AND FCSFiles.Run.ProtocolStep = \'Keywords\''
                ;

        var strTableFiles = new LABKEY.ext.Store({
            listeners: {
                load: function(){
                    if ( flagNotSorting ){
                        smCheckBoxFiles.selectAll();
                        updateTableFilesStatus();

                        flagNotSorting = false;
                        if ( strTableFiles.getCount() == 0 ){
                            updateInfoStatus( 'There are no samples in the chosen sample group', -1 );
                        } else {
                            updateInfoStatus( '' );
                        }
                    }

                    flagLoading = false;
                    btnNext.setDisabled(false);

                    cbStudyVarName.setDisabled(false);

                    cbXML.setDisabled(false);
                    cbSampleGroup.setDisabled(false);
                    tfAnalysisName.setDisabled(false);
                    tfAnalysisDescription.setDisabled(false);

                    maskStudyVars.hide();
                    maskWorkspaces.hide();


                    // Check to see if a different set of study variables was picked
                    var temp = cbStudyVarName.getValue();;

                    if ( temp != selectedStudyVars ){
                        selectedStudyVars = temp;

                        var i, len, c, curLabel, curValue, newColumns;

                        // Grab the choices array
                        var arrayStudyVars = cbStudyVarName.getValueEx();

                        newColumns =
                            [
                                factoryRowNumberer( strTableFiles ),
                                smCheckBoxFiles,
                                {
                                    dataIndex: 'FileName',
                                    filter: {
                                        type: 'string'
                                    },
                                    header: 'File Name'
                                }
                            ];

                        len = arrayStudyVars.length;

                        for ( i = 0; i < len; i ++ ){
                            c = arrayStudyVars[i];
                            curLabel = c.Display; curValue = LABKEY.QueryKey.encodePart( c.Value );

                            newColumns.push({
                                dataIndex: curValue,
                                filter: {
                                    options: strTableFiles.collect( curValue ),
                                    type: 'list'
                                },
                                header: curLabel
                            });

                        } // end of for ( i = 0; i < len; i ++ ) loop

                        flagNotSorting = true;

                        pnlTableFiles.reconfigure(
                            strTableFiles,
                            new Ext.grid.ColumnModel({
                                columns: newColumns,
                                defaults: {
                                    dragable: false,
                                    resizable: true,
                                    sortable: true
                                }
                            })
                        );
                    }
                },
                // See https://www.labkey.org/issues/home/Developer/issues/details.view?issueId=17514
                // Would have to modify the message, once that's fixed
                loadexception: function(){
                    onFailure({
                        exception: 'The Filter might be too long for the current version of Labkey to handle, known issue.'
                    });
                }
            },
//                    nullRecord: {
//                        displayColumn: 'myDisplayColumn',
//                        nullCaption: '0'
//                    },
            remoteSort: false,
            schemaName: 'flow',
            sortInfo: {
                field: 'FileName',
                direction: 'ASC'
            },
            sql: strngSqlStartTable + strngSqlEndTable
        });

        var strStudyVarName = new Ext.data.ArrayStore({
            data: [],
            fields: ['Flag', 'Display', 'Value'],
            listeners: {
                exception: onFailure
            },
            hasMultiSort: true,
            multiSortInfo: {
                sorters: [
                    {
                        field: 'Flag',
                        direction: 'ASC'
                    },
                    {
                        field: 'Display',
                        direction: 'ASC'
                    }
                ],
                direction: 'ASC'
            }
        });

        var strGatingSet = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                load: function() {
                    pnlTableAnalyses.autoExpandColumn = 'Description';

                    pnlTableAnalyses.reconfigure(
                        strGatingSet,
                        new Ext.grid.ColumnModel({
                            columns: [
                                factoryRowNumberer( strGatingSet ),
                                smCheckBoxAnalyses,
                                {
                                    dataIndex: 'Name',
                                    header: 'Name',
                                    width: 160
                                },
                                {
                                    dataIndex: 'Created',
                                    fixed: true,
                                    header: 'Creation Time',
                                    renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s'),
                                    width: 160
                                },
                                {
                                    dataIndex: 'Description',
                                    header: 'Description',
                                    id: 'Description'
                                }
                            ],
                            defaults: {
                                dragable: false,
                                filterable: true,
                                hideable: false,
                                resizable: true,
                                sortable: true
                            }
                        })
                    );
                },
                loadexception: onFailure
            },
            queryName: 'GatingSet',
            schemaName: 'opencyto_preprocessing'
        });


        //////////////////////////////////////////////////////////////////
        //             Queries and associated functionality             //
        //////////////////////////////////////////////////////////////////
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
                    LABKEY.Query.getQueryDetails({
                        failure: fetchKeywords,
                        queryName: 'Samples',
                        schemaName: 'Samples',
                        success: function(queryInfo){
                            var i = 13, toAdd, len = queryInfo.columns.length; // the first 13 columns are system and are of no interest

                            for ( i; i < len; i ++ ){
                                toAdd = queryInfo.columns[i].name;
                                listStudyVars.push( [ 'E', toAdd + ' (External)', 'Sample/' + toAdd ] );
                            }

                            fetchKeywords();
                        }
                    });

                } else {
                    fetchKeywords();
                }
            },
            failure: fetchKeywords
        });

        function fetchKeywords(){
            LABKEY.Query.selectRows({
                columns: ['Name'],
                failure: onFailure,
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
                    }
            });
        }


        /////////////////////////////////////
        //      Sessions instanciation     //
        /////////////////////////////////////
        LABKEY.Report.createSession({
            failure: onFailure,
            success: function(data){
                reportSessionIdCreate = data.reportSessionId;
            }
        });

        LABKEY.Report.createSession({
            failure: onFailure,
            success: function(data){
                reportSessionIdDelete = data.reportSessionId;
            }
        });

        /////////////////////////////////////
        //     ComboBoxes / TextFields     //
        /////////////////////////////////////
        var cbStudyVarName = new Ext.ux.form.SuperBoxSelect({
            displayField: 'Display',
            getAllValuesAsArray: function(){
                var c = [];

                Ext.each( this.store.data.items, function(r){ c.push( r.data.Value ); } );

                Ext.each( this.usedRecords.items, function(r){ c.push( r.data.Value ); } );

                return c;
            },
            lazyInit: false,
            listeners: {
                /*focus: function (){ // display the dropdown on focus
                    this.expand();
                },*/
            },
            resizable: true,
            store: strStudyVarName,
            supressClearValueRemoveEvents: true,
            valueField: 'Value'
        });

        var lastlySelectedXML = undefined;

        var cbXML = new Ext.form.ClearableComboBox({
            displayField: 'FileName',
            lazyInit: false,
            listeners: {
                change: function(){
                    if ( this.getValue() == '' ){
                        cbSampleGroup.setDisabled(true);
                        cbXML.focus();
                    } else {
                        manageWorkspace();
                    }
                },
                cleared: function(){
                    btnNext.setDisabled(true);
                    cbSampleGroup.setDisabled(true);
                    cbSampleGroup.clearValue();
                },
                select: manageWorkspace
            },
            store: strXML,
            tpl: '<tpl for="."><div class=\'x-combo-list-item\'>{FileName:htmlEncode}</div></tpl>',
            valueField: 'FilePath',
            width: 200
        });

        var cbSampleGroup = new Ext.form.ClearableComboBox({
            disabled: true,
            displayField: 'SampleGroup',
            lazyInit: false,
            listeners: {
                change: function(){
                    if ( this.getValue() != '' ){
                        manageAnalysisTextFields();

                        btnNext.setDisabled(false);
                    } else {
                        manageSampleGroup();
                    }
                },
                cleared: function(){
                    btnNext.setDisabled(true);

                    this.focus();
                },
                select: function(){
                    cbSampleGroup.triggerBlur();
                    manageAnalysisTextFields();

                    btnNext.setDisabled(false);
                }
            },
            store: strSampleGroup,
            tpl: '<tpl for="."><div class=\'x-combo-list-item\'>{SampleGroup:htmlEncode}</div></tpl>',
            valueField: 'SampleGroup',
            width: 200
        });

//        strSampleGroup.on( 'load', manageSampleGroup ); // probably not needed, achieved through change event of cbXML

        var tfAnalysisName = new Ext.form.TextField({
            emptyText: 'Type...',
            width: 200
        });

        var tfAnalysisDescription = new Ext.form.TextField({
            emptyText: 'Type...',
            width: 200
        });


        /////////////////////////////////////
        //             Buttons             //
        /////////////////////////////////////
        var btnBack = new Ext.Button({
            disabled: true,
            text: '< Back'
        });

        var btnNext = new Ext.Button({
            text: 'Next >'
        });

        var btnDelete = new Ext.Button({
            disabled: true,
            handler: function(){

                var records = smCheckBoxAnalyses.getSelections();

                cnfDeleteAnalysis.inputParams = {
                    gsId:           records[0].data.Id,
                    gsPath:         records[0].data.Path,
                    container:      records[0].data.EntityId,
                    showSection:    'textOutput' // comment out to show debug output
                };

                cnfDeleteAnalysis.reportSessionId = reportSessionIdDelete;
                maskDelete.show();
                LABKEY.Report.execute( cnfDeleteAnalysis );
            },
            margins: { top: 0, right: 0, bottom: 0, left: 4 },
            text: 'Delete'
        });


        /////////////////////////////////////
        //             Web parts           //
        /////////////////////////////////////
        var cnfSampleGroupsFetching = {
            failure: function( errorInfo, options, responseObj ) {
                unmask();

                onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/SampleGroups.r',
            success: function( result ) {
                unmask();

                var errors = result.errors;
                var outputParams = result.outputParams;

                if (errors && errors.length > 0) {
                    /*
                    msg : errors[0].replace(/\n/g, '<P>'),
                     */

                    if ( errors[0].search('The report session is invalid') < 0 ){
                        onFailure({
                            exception: errors[0].replace(/Execution halted\n/, 'Execution halted') + '.'
                        });
                    } else {
                        LABKEY.Report.createSession({
                            failure: onFailure,
                            success: function(data){
                                reportSessionIdCreate = data.reportSessionId;

                                cnfSampleGroupsFetching.reportSessionId = reportSessionIdCreate;
                                mask( 'Obtaining the available sample groups, please, wait...' );
                                LABKEY.Report.execute( cnfSampleGroupsFetching );
                            }
                        });
                    }
                } else {
                    var p = outputParams[0];

                    if ( p.type == 'json' ) {
                        var inputArray = p.value;

//                        pnlCreate.getLayout().setActiveItem( 1 );
//                        btnNext.setText( 'Next >' );
//                        btnBack.setDisabled(false);

                        loadStoreWithArray( strSampleGroup, inputArray );

                        lastlySelectedXML = cbXML.getValue();
                        cbXML.triggerBlur();
                    }

                    p = outputParams[1];

                    if ( p.type == 'json' ) {
                        sampleGroupsMap = p.value;
                    }
                }
            }
        };

        var wpParseConfig = {
            reportId: 'module:OpenCytoPreprocessing/OpenCytoPreprocessing.r',
//            showSection: 'textOutput', // comment out to show debug output
            title: 'ParseDiv'
        };

        var wpParse = new LABKEY.WebPart({
            failure: function( errorInfo, options, responseObj ){
                unmask();

                btnNext.setDisabled(false);

                onFailure( errorInfo, options, responseObj );
            },
            frame: 'none',
            partConfig: wpParseConfig,
            partName: 'Report',
            renderTo: 'wpParse' + config.webPartDivId,
            success: function(){
                unmask();

                btnNext.setDisabled(false);

                if ( $('#wpParse' + config.webPartDivId + ' .labkey-error').length > 0 ){

                    var inputArray = $('#wpParse' + config.webPartDivId + ' pre')[0].innerHTML;
                    if ( inputArray.search('The report session is invalid') < 0 ){
                        if ( inputArray.search('java.lang.RuntimeException') < 0 ){
                            if ( inputArray.search('javax.script.ScriptException') < 0 ){
                                onFailure({
                                    exception: inputArray + '.'
                                });
                            } else {
                                onFailure({
                                    exception: inputArray.replace(/Execution halted\n/, 'Execution halted') + '.'
                                });
                            }
                        } else {
                            onFailure({
                                exception: inputArray + '.'
                            });
                        }

                        pnlWorkspaces.getEl().frame('ff0000');
                    } else {
                        LABKEY.Report.createSession({
                            failure: onFailure,
                            success: function(data){
                                reportSessionIdCreate = data.reportSessionId;

                                btnNext.setDisabled(true);

                                wpParseConfig.reportSessionId = reportSessionIdCreate;
                                mask( 'Generating and saving the analysis data, please, wait...' );
                                wpParse.render();
                            }
                        });
                    }
                } else {
//                var activeIndex = this.items.indexOf( this.getLayout().activeItem ) + direction;
                    pnlCreate.getLayout().setActiveItem( 1 );
                    btnNext.setText( 'Next >' );
                    btnBack.setDisabled(false);
                }
                strGatingSet.reload();
            }
        });

        var cnfDeleteAnalysis = {
            failure: function( errorInfo, options, responseObj ) {
                maskDelete.hide();

                tfAnalysisDescription.setDisabled(false);

                strGatingSet.reload();

                btnDelete.setDisabled(true);

                onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/Delete.r',
            success: function( result ) {
                maskDelete.hide();

                tfAnalysisName.setDisabled(false);

                var errors = result.errors;
                var outputParams = result.outputParams;

                if (errors && errors.length > 0) {
                    if ( errors[0].search('The report session is invalid') < 0 ){
                        onFailure({
                            exception: errors[0].replace(/Execution halted\n/, 'Execution halted') + '.'
                        });
                    } else {
                        LABKEY.Report.createSession({
                            failure: onFailure,
                            success: function(data){
                                reportSessionIdDelete = data.reportSessionId;

                                cnfDeleteAnalysis.reportSessionId = reportSessionIdDelete;
                                maskDelete.show();
                                LABKEY.Report.execute( cnfDeleteAnalysis );
                            }
                        });
                    }
                } else {
                    var p = outputParams[0];

                    Ext.Msg.alert('Info', p.value);

                    strGatingSet.reload();

                    btnDelete.setDisabled(true);
                }
            }
        };


        /////////////////////////////////////
        //  Panels, Containers, Components //
        /////////////////////////////////////
        var cmpStudyVars = new Ext.Component({
            cls: 'bold-text',
            html: '&nbspSelect the study variables that are of interest for this project:'
        });

        var cmpStatus = new Ext.Component({
            style: { paddingLeft: '10px' }
        });

        var pnlStudyVars = new Ext.Panel({
            defaults: {
                style: 'padding-top: 4px;'
            },
            forceLayout: true,
            items: [
                cmpStudyVars,
                new Ext.Panel({
                    border: false,
                    items: [ cbStudyVarName ],
                    layout: 'fit'
                })
            ],
            listeners: {
                afterrender: function(){
                    maskStudyVars = new Ext.LoadMask( this.getEl(), { msgCls: 'x-mask-loading-custom' } );
                }
            },
            title: 'Study variables'
        });


        new Ext.Panel({
            border: false,
            forceLayout: true,
            headerCssClass: 'simple-panel-header',
            items: [ cbXML ],
            layout: 'fit',
            renderTo: 'pnlXml' + config.webPartDivId,
            title: 'Select the workspace:'
        });

        new Ext.Panel({
            border: false,
            forceLayout: true,
            headerCssClass: 'simple-panel-header',
            items: [ cbSampleGroup ],
            layout: 'fit',
            renderTo: 'pnlSampleGroup' + config.webPartDivId,
            title: 'Select the sample group:'
        });

        new Ext.Panel({
            border: false,
            forceLayout: true,
            headerCssClass: 'simple-panel-header',
            items: [ tfAnalysisName ],
            layout: 'fit',
            renderTo: 'pnlAnalysisName' + config.webPartDivId,
            title: 'Enter analysis name:'
        });

        new Ext.Panel({
            border: false,
            forceLayout: true,
            headerCssClass: 'simple-panel-header',
            items: [ tfAnalysisDescription ],
            layout: 'fit',
            renderTo: 'pnlAnalysisDescription' + config.webPartDivId,
            title: 'Enter analysis description:'
        });


        var pnlList = new Ext.Panel({
			border: false,
            contentEl: 'ulList' + config.webPartDivId,
            forceLayout: true
        });

        var pnlWorkspaces = new Ext.Panel({
           	autoHeight: true,
			border: false,
            defaults: {
                hideMode: 'offsets',
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            forceLayout: true,
           	hideMode: 'offsets',
            items: [
                pnlList,
                new Ext.Component({
                    contentEl: 'wpParse' + config.webPartDivId,
                    forceLayout: true
                })
            ],
            listeners: {
                afterrender: function(){
                    maskWorkspaces = new Ext.LoadMask( this.getEl(), { msgCls: 'x-mask-loading-custom' } );
                }
            },
            title: 'Workspaces'
        });

        var smCheckBoxFiles = new Ext.grid.CheckboxSelectionModel({
            filterable: false,
            listeners: {
                selectionchange: updateTableFilesStatus
            },
            sortable: true,
            width: 23,
            xtype: 'booleancolumn' // any use ? for filtering ?
        });

        var pnlTableFiles = new Ext.grid.GridPanel({
            autoScroll: true,
            border: false,
//        colModel: new Ext.ux.grid.LockingColumnModel([
//            {
//                dataIndex: 'FileName',
//                header: 'File Name',
//                resizable: true,
//                sortable: true
//            }
//        ]),
            columnLines: true,
            columns: [
                factoryRowNumberer( strTableFiles ),
                smCheckBoxFiles,
                {
                    dataIndex: 'FileName',
                    header: 'File Name'
                }
            ],
            enableColumnHide: false,
            forceLayout: true,
            headerCssClass: 'simpler-panel-header',
            height: 200,
            loadMask: {
                msg: strngLoadingPhenoData,
                msgCls: 'x-mask-loading-custom'
            },
            listeners:
            {
                render: function(){ initTableQuickTips( this.header ); }
            },
            plugins:
            [
                'autosizecolumns',
                new Ext.ux.plugins.CheckBoxMemory({ idProperty: 'FileName' }),
                new Ext.ux.grid.GridFilters({
                    encode: false,
                    local: true,
                })
            ],
            selModel: smCheckBoxFiles,
            store: strTableFiles,
            stripeRows: true,
            title: 'Files',
//                    view: new Ext.ux.grid.LockingGridView(),
            viewConfig:
            {
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlCompensation = new Ext.Panel({
           	autoHeight: true,
			border: false,
            defaults: {
                hideMode: 'offsets',
                style: 'padding-top: 4px; padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            forceLayout: true,
           	hideMode: 'offsets',
            items: [
                new Ext.form.RadioGroup({
                    autoHeight: true,
                    columns: 1,
                    items: [
                        {
                            boxLabel: 'From workspace',
                            checked: true,
                            inputValue: 1,
                            name: 'Workspace'
                        },
                        {
                            boxLabel: 'Manual input',
                            disabled: true,
                            inputValue: 2,
                            name: 'Manual'
                        },
                        {
                            boxLabel: 'Compute automatically',
                            disabled: true,
                            inputValue: 3,
                            name: 'Automatic'
                        }
                    ]
                })
            ],
            listeners: {
                afterrender: function(){
                    maskCompensation = new Ext.LoadMask( this.getEl(), { msgCls: 'x-mask-loading-custom' } );
                }
            },
            title: 'Compensation'
        });


        var pnlCreate = new Ext.Panel({
            activeItem: 0,
            bodyStyle: {
                paddingTop: '3px'
            },
            border: false,
            defaults: {
                autoHeight: true,
            	forceLayout: true,
                hideMode: 'offsets'
            },
            deferredRender: false,
            forceLayout: true,
            items: [
                pnlStudyVars,
                {
                    items: pnlWorkspaces,
                    layout: 'fit'
                },
                {
                    items: pnlTableFiles,
                    layout: 'fit',
                    listeners: {
                        afterrender: function(){
                            maskFiles = new Ext.LoadMask( this.getEl(), { msgCls: 'x-mask-loading-custom' } );
                        },
                        render: function(){ initTableQuickTips( this.header ); }
                    },
                    title: 'Filter data'
                },
                {
                    items: pnlCompensation,
                    layout: 'fit'
                }
            ],
            layout: 'card',
            tbar: new Ext.Toolbar({
                items: [ btnBack, btnNext, cmpStatus ]
            }),
            title: 'Create'
        });


        var smCheckBoxAnalyses = new Ext.grid.CheckboxSelectionModel({
            filterable: false,
            header: '<div></div>',
            listeners: {
                selectionchange: function(){
                    if ( smCheckBoxAnalyses.getCount() > 0 ){
                        btnDelete.setDisabled( false );
                    } else {
                        btnDelete.setDisabled( true );
                    }
                }
            },
            singleSelect: true,
            sortable: true,
            width: 23
        });

        var filtersAnalyses = new Ext.ux.grid.GridFilters({
            encode: false,
            local: true,
            filters: [
                {
                    dataIndex: 'Name',
                    type: 'string'
                },
                {
                    dataIndex: 'Description',
                    type: 'string'
                },
                {
                    dataIndex: 'Created',
                    dateFormat: 'Y-m-d H:i:s',
                    type: 'date'
                }
            ]
        });

        var pnlTableAnalyses = new Ext.grid.GridPanel({
            autoScroll: true,
            columns: [],
            columnLines: true,
            enableColumnHide: false,
            forceLayout: true,
            height: 200,
            loadMask: { msg: 'Loading generated analyses, please, wait...', msgCls: 'x-mask-loading-custom' },
            listeners:
            {
                reconfigure: function(){ smCheckBoxAnalyses.clearSelections(); },
                render: function(){ initTableQuickTips( this.header ); }
            },
            plugins:
            [
                'autosizecolumns',
                new Ext.ux.plugins.CheckBoxMemory({ idProperty: 'Name' }),
                filtersAnalyses
            ],
            selModel: smCheckBoxAnalyses,
            store: strGatingSet,
            stripeRows: true,
            tbar: new Ext.Toolbar({
                items: [
                    btnDelete
                ],
                listeners:
                {
                    render: function(){ initTableQuickTips( this ); }
                },
            }),
            title: 'Select the analysis to delete:',
            viewConfig:
            {
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });


        var pnlDelete = new Ext.Panel({
            border: false,
            defaults: {
                autoHeight: true,
                hideMode: 'offsets'
            },
            forceLayout: true,
            items: [
                {
                    border: false,
                    defaults: {
                        hideMode: 'offsets'
                    },
                    items: [ pnlTableAnalyses ],
                    layout: 'fit'
                }
            ],
            layout: 'fit',
            listeners: {
                afterrender: function(){
                    maskDelete = new Ext.LoadMask(
                        this.getEl(),
                        {
                            msg: 'Deleting the selected analysis and its associated data...',
                            msgCls: 'x-mask-loading-custom'
                        }
                    );
                }
            }
        });

        var pnlTabs = new Ext.TabPanel({
            activeTab: 0,
            autoHeight: true,
            defaults: {
                autoHeight: true,
                hideMode: 'offsets',
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            deferredRender: false,
            forceLayout: true,
            items: [
                pnlCreate,
                {
                    items: pnlDelete,
                    layout: 'fit',
                    title: 'Delete'
                }
            ],
            layoutOnTabChange: true,
            listeners: {
                tabchange: function(tabPanel, tab){
                    if ( tab.title == 'Create' ){
                        if ( pnlCreate.items.indexOf( pnlCreate.getLayout().activeItem ) == 1 ){
                            manageSampleGroup();
                        }
                    }
                }
            },
            minTabWidth: 100,
            resizeTabs: true,
            width: '100%'
        });

        btnBack.on( 'click', navHandler.createDelegate( pnlCreate, [-1] ) );
        btnNext.on( 'click', navHandler.createDelegate( pnlCreate, [1] ) );


        /////////////////////////////////////
        //             Functions           //
        /////////////////////////////////////
        function loadTableFiles(){
            flagLoading = true;
            btnNext.setDisabled(true);

            cbStudyVarName.setDisabled(true);
            cbXML.setDisabled(true);
            cbSampleGroup.setDisabled(true);
            tfAnalysisName.setDisabled(true);
            tfAnalysisDescription.setDisabled(true);

            maskStudyVars.msg = strngLoadingPhenoData;
            maskStudyVars.show();
            maskWorkspaces.msg = strngLoadingPhenoData;
            maskWorkspaces.show();

            strTableFiles.load();
        };

        function manageAnalysisTextFields(){
            if ( tfAnalysisName.getValue() == '' ){
                tfAnalysisName.focus();
            } else {
                if ( tfAnalysisDescription.getValue() == '' ){
                    tfAnalysisDescription.focus();
                }
            }
        };

        function manageWorkspace(){
            var value = cbXML.getValue();

            if ( value != lastlySelectedXML ){

                cbSampleGroup.clearValue();

                cnfSampleGroupsFetching.inputParams = {
                    wsPath: decodeURI( value ).slice(5)
                    , showSection: 'textOutput' // comment out to show debug output
                };

                cnfSampleGroupsFetching.reportSessionId = reportSessionIdCreate;
                mask( 'Obtaining the available sample groups, please, wait...' );
                LABKEY.Report.execute( cnfSampleGroupsFetching );

            } else {
                cbSampleGroup.setDisabled(false);

                manageSampleGroup();
            }
        };

        function manageSampleGroup(){
            var count = strSampleGroup.getCount();
            if ( count > 1 ){
                cbSampleGroup.focus();
                cbSampleGroup.expand();
            } else if ( count == 1 ) {
                cbSampleGroup.setValue( strSampleGroup.getAt(0).data.SampleGroup );
                btnNext.setDisabled(false);
                cbSampleGroup.triggerBlur();
                tfAnalysisName.focus();
            }
        };

        function processHandler(){
            if ( tfAnalysisName.getValue() == '' ){
                pnlCreate.getLayout().setActiveItem( 1 );
                btnNext.setText( 'Next >' );

                updateInfoStatus( 'Empty analysis name is not allowed', -1 );
                tfAnalysisName.focus();
                tfAnalysisName.getEl().frame( 'ff0000', 1, { duration: 3 } );
            } else {
                if ( cbSampleGroup.getValue() != '' ){
                    var filesNames = [], filesIds = [];
                    Ext.each( smCheckBoxFiles.getSelections(), function( record ){
                        filesNames.push( record.data.FileName );
                        filesIds.push( record.data.FileId );
                    });
                    if ( filesIds.length == 0 ){
                        Ext.Msg.alert(
                            'Error',
                            'There are no FCS files selected for processing.'
                        );
                        pnlCreate.getLayout().setActiveItem( 2 );
                        btnNext.setText( 'Next >' );

                    } else{
                        wpParseConfig.studyVars             = cbStudyVarName.getValuesAsArray().sort().join();
                        wpParseConfig.allStudyVars          = cbStudyVarName.getAllValuesAsArray().sort().join();
                        wpParseConfig.filesNames            = filesNames.sort().join();
                        wpParseConfig.filesIds              = filesIds.join(';'); // semicolor important for Labkey filter creation

                        wpParseConfig.xmlPath               = cnfSampleGroupsFetching.inputParams.wsPath;
                        wpParseConfig.sampleGroupName       = cbSampleGroup.getValue();
                        wpParseConfig.analysisName          = tfAnalysisName.getValue();
                        wpParseConfig.analysisDescription   = tfAnalysisDescription.getValue();

                        LABKEY.Query.selectRows({
                            columns: ['RootPath'],
                            failure: onFailure,
                            /*filterArray: LABKEY.Filter.create(
                                    'FileId',
                                    filesIds.join(';'),
                                    LABKEY.Filter.Types.IN
                            ),*/
                            queryName: 'RootPath',
                            schemaName: 'flow',
                            success: function(data){
                                var count = data.rowCount, i = 1;

                                if ( count < 1 ){
                                    // disable all
                                    btnNext.setDisabled(true);
                                    cbStudyVarName.setDisabled(true);
                                    pnlTabs.getEl().mask('Seems like you have not imported any FCS files, click <a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a> to do so.' + strngErrorContactWithLink, 'infoMask');
                                } else {
                                    wpParseConfig.rootPath = data.rows[0].RootPath;

                                    for ( i; i < count; i ++ ){
                                        wpParseConfig.rootPath = lcs( wpParseConfig.rootPath, data.rows[i].RootPath );
                                    }

                                    wpParseConfig.rootPath = dirname( wpParseConfig.rootPath );

                                    btnNext.setDisabled(true);

                                    wpParseConfig.reportSessionId       = reportSessionIdCreate;
                                    mask( 'Generating and saving the analysis data, please, wait...' );
                                    wpParse.render();
                                }
                            }
                        });
                    }
                }
            }
        };

        function mask( msg ){
            cbXML.setDisabled(true);
            cbSampleGroup.setDisabled(true);
            tfAnalysisName.setDisabled(true);
            tfAnalysisDescription.setDisabled(true);

            if ( msg.charAt(0) != 'O' ){ // if obtaining Sample Groups, while they are being fetched
                maskStudyVars.msg = msg; // can go one page back and tingle with the study variables
                maskStudyVars.show();
            }
            maskWorkspaces.msg = msg;
            maskWorkspaces.show();
            maskFiles.msg = msg;
            maskFiles.show();
            maskCompensation.msg = msg;
            maskCompensation.show();

            flagCreate = true;
        };

        function unmask(){
            cbXML.setDisabled(false);
            cbSampleGroup.setDisabled(false);
            tfAnalysisName.setDisabled(false);
            tfAnalysisDescription.setDisabled(false);

            maskStudyVars.hide();
            maskWorkspaces.hide();
            maskFiles.hide();
            maskCompensation.hide();

            flagCreate = false;
        };

        function updateInfoStatus( text, code ){
            cmpStatus.update( text );
            if ( text != '' ){
                if ( code == -1 ){
                    cmpStatus.getEl().setStyle( {color: 'red'} );
                    cmpStatus.getEl().frame( 'ff0000', 1, { duration: 3 } ); // RED ERROR
                } else if ( code == 1 ) {
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                }
                else {
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                    cmpStatus.getEl().frame();
                }
            }
        };

        function updateTableFilesStatus(){
            var selectedCount = smCheckBoxFiles.getCount();

            // Update the table's title
            if ( selectedCount == 1 ){
                pnlTableFiles.setTitle( selectedCount + ' file is currently selected' );
            } else {
                pnlTableFiles.setTitle( selectedCount + ' files are currently selected' );
            }
        };

        function updateTableFiles() {
            // Reload the data from the db if at least one of the 2 is true:
            // 1) user chose a different set of study variables from last time
            // 2) user chose a different sample group from last time

            // Check to see if a different set of study variables was picked
            var temp = cbStudyVarName.getValue();;

            if ( temp != selectedStudyVars ){

                var i, len, c, curLabel, curValue, curFlag, tempSQL;

                // Grab the choices array
                var arrayStudyVars = cbStudyVarName.getValueEx();

                tempSQL = strngSqlStartTable;

                len = arrayStudyVars.length;

                for ( i = 0; i < len; i ++ ){
                    c = arrayStudyVars[i];
                    curLabel = c.Display; curValue = LABKEY.QueryKey.encodePart( c.Value ); curFlag = curLabel.slice(-2,-1);

                    if ( curFlag == 'l' ){ // External study variable
                        curLabel = curLabel.slice(0, -11);
                        tempSQL += ', CAST( FCSFiles.Sample."' + curLabel + '" AS VARCHAR ) AS "' + curValue + '"';
                        curLabel += ' (External)';
                    } else if ( curFlag == 'd' ){ // Keyword study variable
                        curLabel = curLabel.slice(0, -10);
                        tempSQL += ', CAST( FCSFiles.Keyword."' + curLabel + '" AS VARCHAR ) AS "' + curValue + '"';
                        curLabel += ' (Keyword)';
                    } else {
                        i = len;
                        onFailure({
                            exception: 'there was an error while executing this command: data format mismatch.'
                        });
                    }
                } // end of for ( i = 0; i < len; i ++ ) loop

                tempSQL += strngSqlEndTable;

                flagNotSorting = true;

                strTableFiles.setSql( tempSQL );

                // Check to see if the sample group changed
                temp = cbXML.getValue() + cbSampleGroup.getValue();

                if ( temp != selectedXmlAndSampleGroup ){
                    selectedXmlAndSampleGroup = temp;

                    fileNameFilter =
                        LABKEY.Filter.create(
                            'FileName',
                            sampleGroupsMap[ cbSampleGroup.getValue() ].join(';'),
                            LABKEY.Filter.Types.IN
                        );

                    flagNotSorting = true;

                    strTableFiles.setUserFilters( [ fileNameFilter ] );
                }

                loadTableFiles();

            } else {
                // Check to see if the sample group changed
                temp = cbXML.getValue() + cbSampleGroup.getValue();

                if ( temp != selectedXmlAndSampleGroup ){
                    selectedXmlAndSampleGroup = temp;

                    fileNameFilter =
                        LABKEY.Filter.create(
                            'FileName',
                            sampleGroupsMap[ cbSampleGroup.getValue() ].join(';'),
                            LABKEY.Filter.Types.IN
                        );

                    flagNotSorting = true;

                    strTableFiles.setUserFilters( [ fileNameFilter ] );

                    loadTableFiles();

                } else { // the case where neither was changed and nothing needs to be changed: neither rows, nor columns of the table
                    if ( strTableFiles.getCount() == 0 ){
                        updateInfoStatus( 'There are no samples in the chosen sample group', -1 );
                    }
                }
            }
         }; // end of updateTableFiles()

        function navHandler(direction){

            updateInfoStatus( '' );

            var
                oldIndex = this.items.indexOf( this.getLayout().activeItem ),
                newIndex = oldIndex + direction;

            this.getLayout().setActiveItem( newIndex );

            if ( newIndex == 0 ){
                btnBack.setDisabled(true);
                btnNext.setDisabled(false);
            }

            if ( newIndex == 1 ){
                btnBack.setDisabled(false);
                btnNext.setDisabled(true);

                if ( cbXML.getValue() == '' ){
                    var count = strXML.getCount();
                    if ( count > 1 ){
                        cbXML.focus();
                        cbXML.expand();
                    } else if ( count == 1 ) {
                        cbXML.setValue( strXML.getAt(0).data.FilePath );

                        manageWorkspace();
                    }
                } else {
                    if ( cbSampleGroup.getValue() == '' ){
                        btnNext.setDisabled(true);

                        manageSampleGroup();
                    } else {
                        btnNext.setDisabled(false);
                    }
                }
            }

            if ( newIndex == 2 ){
                if ( oldIndex == 1 ){
                    if ( ! flagLoading ){
                        updateTableFiles();
                    } else {
                        btnNext.setDisabled(true);
                    }
                } else if ( oldIndex == 3 ){
                    btnNext.setDisabled(false);
                    btnNext.setText('Next >');
                    if ( strTableFiles.getCount() == 0 ){
                        updateInfoStatus( 'There are no samples in the chosen sample group', -1 );
                    }
                }
            }

            if ( newIndex == 3 ){
                btnNext.setText('Process >');
                if ( cbXML.getValue() == '' || cbSampleGroup.getValue() == '' || flagCreate ) {
                    btnNext.setDisabled(true);
                } else {
                    btnNext.setDisabled(false);
                }
            }

            if ( newIndex == 4 ){
                processHandler();
            }
        };


        // jQuery-related


        this.border = false;
        this.boxMinWidth = 370;
        this.frame = false;
        this.items = [ pnlTabs ];
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
