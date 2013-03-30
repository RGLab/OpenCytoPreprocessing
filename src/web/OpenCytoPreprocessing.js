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
            reportSessionId             = undefined,
            rootPath                    = undefined,

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
                    [],
                    LABKEY.Filter.Types.IN
                ),
            listStudyVars               = []
            ;


        /////////////////////////////////////
        //             Strings             //
        /////////////////////////////////////
        var strngErrorContactWithLink = ' Please, contact the <a href=\'mailto:ldashevs@fhcrc.org?Subject=OpenCytoPreprocessing%20Support\'>developer</a>, if you have questions.'


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

        var strFilteredTable = new LABKEY.ext.Store({
            listeners: {
                load: function(){
                    if ( flagNotSorting ){
                        pnlTable.getSelectionModel().selectAll();

                        flagNotSorting = false;
                    }

                    updateTableStatus();

                    flagLoading = false;
                    btnNext.setDisabled(false);

                    cbStudyVarName.setDisabled(false);
                    cbXML.setDisabled(false);
                    cbSampleGroup.setDisabled(false);
                    tfAnalysisName.setDisabled(false);
                    tfAnalysisDescription.setDisabled(false);

                    maskStudyVars.hide();
                    maskWorkspaces.hide();
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
                loadexception: onFailure
            },
            queryName: 'GatingSet',
            schemaName: 'opencyto_preprocessing'
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
                var count = data.rowCount, i = 1;

                if ( count < 1 ){
                    // disable all
                    btnNext.setDisabled(true);
                    cbStudyVarName.setDisabled(true);
                    pnlTabs.getEl().mask('Seems like you have not imported any FCS files, click <a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a> to do so.' + strngErrorContactWithLink, 'infoMask');
                } else {
                    rootPath = data.rows[0].RootPath;

                    for ( i; i < count; i ++ ){
                        rootPath = lcs( rootPath, data.rows[i].RootPath );
                    }

                    rootPath = dirname( rootPath );
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
        //      Session instanciation      //
        /////////////////////////////////////
        LABKEY.Report.createSession({
            failure: onFailure,
            success: function(data){
                reportSessionId = data.reportSessionId;
            }
        });


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
                /*focus: function (){ // display the dropdown on focus
                    this.expand();
                },*/
            },
            minChars: 0,
            mode: 'local',
            resizable: true,
            store: strStudyVarName,
            supressClearValueRemoveEvents: true,
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'Value'
        });

        var lastlySelectedXML = undefined;

        var cbXML = new Ext.form.ClearableComboBox({
            allowBlank: true,
            displayField: 'FileName',
            emptyText: 'Select...',
            forceSelection: true,
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
            minChars: 0,
            mode: 'local',
            store: strXML,
            tpl: '<tpl for="."><div class=\'x-combo-list-item\'>{FileName:htmlEncode}</div></tpl>',
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
            minChars: 0,
            mode: 'local',
            store: strSampleGroup,
            tpl: '<tpl for="."><div class=\'x-combo-list-item\'>{SampleGroup:htmlEncode}</div></tpl>',
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'SampleGroup',
            width: 200
        });

        strSampleGroup.on( 'load', manageSampleGroup );

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

        var cbAnalysis = new Ext.form.ClearableComboBox({
            allowBlank: true,
            autoSelect: false,
            displayField: 'Name',
            emptyText: 'Select...',
            forceSelection: true,
            listeners: {
                change: function(){
                    if ( this.getValue() == '' ){
                        btnDelete.setDisabled(true);
                    } else {
                        btnDelete.setDisabled(false);
                    }
                },
                cleared: function(){
                    btnDelete.setDisabled(true);
                },
                select: function(){
                    btnDelete.setDisabled(false);
                }
            },
            minChars: 0,
            mode: 'local',
            resizable: true,
            store: strGatingSet,
            tpl: '<tpl for="."><div ext:qtip=\'"{Tooltip:htmlEncode}" generated {TimeStamp:htmlEncode}\' class=\'x-combo-list-item\'>{Name:htmlEncode}</div></tpl>',
            triggerAction: 'all',
            typeAhead: true,
            valueField: 'Id'
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
                maskDelete.show();

                cnfDeleteAnalysis.reportSessionId = reportSessionId;
                cnfDeleteAnalysis.inputParams = {
                      gsId:			cbAnalysis.getValue()
                    , gsPath:		cbAnalysis.getSelectedField( 'Path' )
                    , container:	cbAnalysis.getSelectedField( 'EntityId' )
                    , showSection:	'textOutput' // comment out to show debug output
                };

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

                    onFailure({
                        exception: errors[0].replace(/Execution halted\n/, 'Execution halted') + '.'
                    });

                    // need to create a new session if session timed out
                } else {
                    var p = outputParams[0];

                    if ( p.type == 'json' ) {
                        var inputArray = p.value;

                        cbXML.triggerBlur();
                        cbSampleGroup.setDisabled(false);

//                        pnlCreate.getLayout().setActiveItem( 1 );
//                        btnNext.setText( 'Next >' );
//                        btnBack.setDisabled(false);

                        loadStoreWithArray( strSampleGroup, inputArray );

                        lastlySelectedXML = cbXML.getValue();
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
                                reportSessionId = data.reportSessionId;

                                wpParseConfig.reportSessionId = reportSessionId;

                                btnNext.setDisabled(true);

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

                cbAnalysis.setDisabled(false);
                tfAnalysisDescription.setDisabled(false);

                cbAnalysis.clearValue();
                strGatingSet.reload();

                btnDelete.setDisabled(true);

                onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/Delete.r',
            success: function( result ) {
                maskDelete.hide();

                cbAnalysis.setDisabled(false);
                tfAnalysisName.setDisabled(false);

                var errors = result.errors;
                var outputParams = result.outputParams;

                if (errors && errors.length > 0) {
                    onFailure({
                        exception: errors[0].replace(/Execution halted\n/, 'Execution halted') + '.'
                    });

                    // need to create a new session if session timed out
                } else {
                    var p = outputParams[0];

                    Ext.Msg.alert('Info', p.value);

                    cbAnalysis.clearValue();
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
            columns: [],
            forceLayout: true,
            headerCssClass: 'simpler-panel-header',
            height: 200,
            loadMask: { msg: 'Loading pheno data for chosen sample group and study variables, please, wait...', msgCls: 'x-mask-loading-custom' },
            plugins: ['autosizecolumns', new Ext.ux.plugins.CheckBoxMemory({ idProperty: 'FileName' })],
            selModel: smCheckBox,
            store: strFilteredTable,
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
                    items: pnlTable,
                    layout: 'fit',
                    listeners: {
                        afterrender: function(){
                            maskFiles = new Ext.LoadMask( this.getEl(), { msgCls: 'x-mask-loading-custom' } );
                        }
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
                        hideMode: 'offsets',
                        style: 'padding-right: 4px;'
                    },
                    headerCssClass: 'simple-panel-header',
                    items: [ cbAnalysis, btnDelete ],
                    layout: 'hbox',
                    title: 'Select the analysis:'
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

                cnfSampleGroupsFetching.reportSessionId = reportSessionId;

                mask( 'Obtaining the available sample groups, please, wait...' );
                LABKEY.Report.execute( cnfSampleGroupsFetching );

            } else {
                cbXML.triggerBlur();
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
                btnNext.setDisabled(false);

                updateInfoStatus( 'Empty analysis name is not allowed', -1 );
                tfAnalysisName.focus();
                tfAnalysisName.getEl().frame( 'ff0000', 1, { duration: 3 } );
            } else {
                if ( cbSampleGroup.getValue() != '' ){
                    var records = pnlTable.getSelectionModel().getSelections(), filesNames = [], filesIds = [];
                    Ext.each( records, function( record ){
                        filesNames.push( record.data.FileName );
                        filesIds.push( record.data.FileId );
                    } );
                    if ( filesIds.length == 0 ){
                        Ext.Msg.alert(
                            'Error',
                            'There are no FCS files uploaded to the server that are contained in the chosen sample group, pick a different one.'
                        );
                        pnlCreate.getLayout().setActiveItem( 1 );
                        btnNext.setText( 'Next >' );
                        btnNext.setDisabled(false);
                    } else{

                        wpParseConfig.studyVars             = cbStudyVarName.getValuesAsArray().sort().join();
                        wpParseConfig.allStudyVars          = cbStudyVarName.getAllValuesAsArray().sort().join();
                        wpParseConfig.filesNames            = filesNames.sort().join();
                        wpParseConfig.filesIds              = filesIds.join(';'); // semicolor important for Labkey filter creation

                        wpParseConfig.xmlPath               = cnfSampleGroupsFetching.inputParams.wsPath;
                        wpParseConfig.sampleGroupName       = cbSampleGroup.getValue();
                        wpParseConfig.analysisName          = tfAnalysisName.getValue();
                        wpParseConfig.analysisDescription   = tfAnalysisDescription.getValue();

                        wpParseConfig.rootPath              = Ext.util.Format.undef(rootPath);

                        wpParseConfig.reportSessionId       = reportSessionId;

                        btnNext.setDisabled(true);

                        mask( 'Generating and saving the analysis data, please, wait...' );
                        wpParse.render();
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

        function updateTableStatus(){

            var selectedCount = pnlTable.getSelectionModel().getCount();

            // Update the table's title
            if ( selectedCount == 1 ){
                pnlTable.setTitle( selectedCount + ' file is currently selected' );
            } else {
                pnlTable.setTitle( selectedCount + ' files are currently selected' );
            }

            // Manage the 'check all' icon state
            var t = Ext.fly(pnlTable.getView().innerHd).child('.x-grid3-hd-checker');
            var isChecked = t.hasClass('x-grid3-hd-checker-on');
            var totalCount = pnlTable.getStore().getCount();

            if ( selectedCount != totalCount && isChecked ){
                t.removeClass('x-grid3-hd-checker-on');
            } else if ( selectedCount == totalCount && ! isChecked ){
                t.addClass('x-grid3-hd-checker-on');
            }
        };

        function updateTable() {
            // Reload the data from the db if at least one of the 2 is true:
            // 1) user chose a different set of study variables from last time
            // 2) user chose a different sample group from last time

            // Check to see if a different set of study variables was picked
            var temp = cbStudyVarName.getValue();;

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

                flagNotSorting = true;

                strFilteredTable.setSql( tempSQL );

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

                    strFilteredTable.setUserFilters( [ fileNameFilter ] );
                }

                flagLoading = true;
                btnNext.setDisabled(true);

                cbStudyVarName.setDisabled(true);
                cbXML.setDisabled(true);
                cbSampleGroup.setDisabled(true);
                tfAnalysisName.setDisabled(true);
                tfAnalysisDescription.setDisabled(true);

                maskStudyVars.msg = 'Loading pheno data for chosen sample group and study variables, please, wait...';
                maskStudyVars.show();
                maskWorkspaces.ms = 'Loading pheno data for chosen sample group and study variables, please, wait...';
                maskWorkspaces.show();

                strFilteredTable.load();
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

                    strFilteredTable.setUserFilters( [ fileNameFilter ] );

                    flagLoading = true;
                    btnNext.setDisabled(true);

                    cbStudyVarName.setDisabled(true);
                    cbXML.setDisabled(true);
                    cbSampleGroup.setDisabled(true);
                    tfAnalysisName.setDisabled(true);
                    tfAnalysisDescription.setDisabled(true);

                    maskStudyVars.msg = 'Loading pheno data for chosen sample group and study variables, please, wait...';
                    maskStudyVars.show();
                    maskWorkspaces.ms = 'Loading pheno data for chosen sample group and study variables, please, wait...';
                    maskWorkspaces.show();

                    strFilteredTable.load();
                } // else {} the case where neither was changed and nothing needs to be changed: neither rows, nor columns of the table
            }
         }; // end of updateTable()

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
                        updateTable();
                    } else {
                        btnNext.setDisabled(true);
                    }
                } else if ( oldIndex == 3 ){
                    btnNext.setDisabled(false);
                    btnNext.setText('Next >');
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
