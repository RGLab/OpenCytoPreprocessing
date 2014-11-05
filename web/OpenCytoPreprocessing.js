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

Ext.namespace('LABKEY.ext');

LABKEY.ext.OpenCytoPreprocessing = Ext.extend( Ext.Panel, {

    constructor : function(config) {

        /////////////////////////////////////
        //            Variables            //
        /////////////////////////////////////

        var
            me                                  = this,

            maskStudyVars                       = undefined,
            maskWorkspaces                      = undefined,
            maskFiles                           = undefined,
            maskCompensation                    = undefined,
            maskDelete                          = undefined,

            flagCreate                          = undefined,
            flagLoading                         = undefined,

            selectedStudyVars                   = undefined,
            selectedSampleGroups                = {},
            selectedSampleGroupsViolatedCount   = 0,
            selectedWorkspaceAndSampleGroup     = undefined,
            sampleGroupsMap                     = undefined,
            listStudyVars                       = [],
            fileNameFilter                      =
                LABKEY.Filter.create(
                    'FileName',
                    '',
                    LABKEY.Filter.Types.IN
                )
            ;


        /////////////////////////////////////
        //             Strings             //
        /////////////////////////////////////
        var strngErrorContactWithLink   = ' Please, contact support, if you have questions.',
            strngLoadingPhenoData       = 'Loading pheno data for chosen workspaces, sample groups and study variables, please, wait...',
            strngNoSamplesMessage       = 'No files found for the chosen sample group';


        ///////////////////////////////////
        //            Stores             //
        ///////////////////////////////////
        var strWorkspace = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                load: function(){
                    Ext.each(
                        this.data.items,
                        function(e, i, p){
                            p[i].data.FilePath = decodeURI( e.data.FilePath.slice( 5, e.data.FilePath.length ) );
                        }
                    );

                    if ( this.getCount() == 0 ){ // at this time 'Select All' has not been added to the store
                        cbWorkspace.setDisabled(true);
                        tfAnalysisName.setDisabled(true);
                        pnlWorkspaces.getEl().mask(
                            'Seems like you have not imported any workspace files, click ' +
                            '<a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a>' +
                            ' to do so.' + strngErrorContactWithLink, 'infoMask'
                        );
                    }
                },
                loadexception: LABKEY.ext.OpenCyto.onFailure
            },
            queryName: 'Workspaces',
            remoteSort: false,
            schemaName: 'exp',
            sort: 'FileName'
        });

        var strngSqlStartTable  =   'SELECT' +
                                    ' FCSAnalyses.Name AS FileName,' +
                                    ' FCSAnalyses.RowId AS FileIdLink,' +
                                    ' FCSAnalyses.Run.Name AS RunName,' +
                                    ' FCSAnalyses.Run.RowId AS RunId,' +
                                    ' FCSAnalyses.FCSFile.RowId AS FileIdMeta',
            strngSqlEndTable    =   ' FROM FCSAnalyses' +
                                    ' WHERE' +
                                    ' FCSAnalyses.FCSFile.OriginalFCSFile.Original = TRUE OR' +
                                    ' FCSAnalyses.FCSFile.Original = TRUE';

        var strTableFiles = new LABKEY.ext.Store({
            listeners: {
                load: onStrTableFilesLoad,
                loadexception: LABKEY.ext.OpenCyto.onFailure
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
                exception: LABKEY.ext.OpenCyto.onFailure
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
                commitcomplete: function(){
                    pnlTableAnalyses.publish('analysesReload');
                },
                commitexception: function(e){
                    this.rejectChanges();

                    if ( e.indexOf( 'duplicate key value violates unique constraint "uq_gstbl"' ) >= 0 ){
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'There is already an analysis with the same name, <br/>delete it first, or use a different name.<br/>'
                        })
                    } else if ( e.indexOf( 'null value in column "gsname" violates non-null constraint' ) >= 0 ){
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'Blank analysis name is not allowed.<br/>'
                        })
                    }

                    return false;
                },
                load: function(){
                    pnlTableAnalyses.autoExpandColumn = 'Description';

                    pnlTableAnalyses.reconfigure(
                        strGatingSet,
                        new Ext.grid.CustomColumnModel({
                            columns: [
                                LABKEY.ext.OpenCyto.factoryRowNumberer( strGatingSet ),
                                smCheckBoxAnalyses,
                                {
                                    dataIndex: 'gsname',
                                    editor: new Ext.form.TextField(),
                                    header: 'Name',
                                    hideable: false,
                                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                        metaData.attr = 'ext:qtip="' + value + '"';
                                        return value;
                                    },
                                    tooltip: 'Name',
                                    width: 160
                                },
                                {
                                    dataIndex: 'created',
                                    header: 'Creation Time',
                                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                        value = Ext.util.Format.date( value, 'Y-m-d H:i:s' );
                                        metaData.attr = 'ext:qtip="' + value + '"';
                                        return value;
                                    },
                                    tooltip: 'Creation Time',
                                    width: 160
                                },
                                {
                                    dataIndex: 'gsdescription',
                                    editor: new Ext.form.TextField(),
                                    header: 'Description',
                                    id: 'Description',
                                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                        if ( Ext.util.Format.undef(value) != '' && value != null ){
                                            metaData.attr = 'ext:qtip="' + value + '"';
                                        }
                                        return value;
                                    },
                                    tooltip: 'Description'
                                }
                            ],
                            defaults: {
                                filterable: true,
                                resizable: true,
                                sortable: true
                            },
                            disallowMoveBefore: 1
                        })
                    );

                    smCheckBoxAnalyses.clearSelections();
                },
                loadexception: LABKEY.ext.OpenCyto.onFailure
            },
            queryName: 'gstbl',
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
                failure: LABKEY.ext.OpenCyto.onFailure,
                filterArray: [
                    LABKEY.Filter.create( 'Name', 'DISPLAY;BS;MS', LABKEY.Filter.Types.CONTAINS_NONE_OF ),
                    LABKEY.Filter.create(
                        'Name',
                        [ '$', 'LASER', 'EXPORT', 'CST', 'CYTOMETER', 'FJ_', 'CREATOR', 'TUBE NAME', 'WINDOW EXTENSION', 'SPILL', 'BD$' ],
                        LABKEY.Filter.Types.DOES_NOT_START_WITH
                    )
                ],
                queryName: 'Keyword',
                schemaName: 'flow',
                success: function(data){
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
        //     ComboBoxes / TextFields     //
        /////////////////////////////////////
        var cbStudyVarName = new Ext.ux.form.ExtendedLovCombo({
            displayField: 'Display',
            getAllValuesAsArray: function(){
                var c = [];

                // store may be filtered so get all records
                var snapshot = this.getStore().snapshot || this.getStore().data;

                snapshot.each(function(r, index) {
                    if ( ( ( this.addSelectAllItem && index > 0 ) || !this.addSelectAllItem ) ){
                        c.push( r.get(this.valueField) );
                    }
                }, this);

                return c;
            },
            store: strStudyVarName,
            valueField: 'Value'
        });


        var lastlySelectedWorkspace = undefined;

        var cbWorkspace = new Ext.ux.form.ExtendedLovCombo({
            displayField: 'FileName',
            listeners: {
                change: function(){
                    if ( this.getRawValue() == '' ){
                        if ( pnlCreate.items.indexOf( pnlCreate.getLayout().activeItem ) == 1 ){
                            btnNext.setDisabled(true);

                            if ( TreeFilter != undefined ){
                                TreeFilter.clear();
                                sampleGroupsTree.hide();
                            }
                            tfSampleGroup.reset();
                            tfSampleGroup.setDisabled(true);
                            pnlSampleGroup.setDisabledViaClass(true);

                            tfAnalysisName.reset();
                            tfAnalysisDescription.reset();

                            cbWorkspace.focus();
                            cbWorkspace.expand();
                            if ( cbWorkspace.list ){
                                cbWorkspace.restrictHeight();
                            }
                        }
                    } else {
                        obtainSampleGroups();
                    }
                },
                cleared: function(){
                    btnNext.setDisabled(true);

                    if ( TreeFilter != undefined ){
                        TreeFilter.clear();
                        sampleGroupsTree.hide();
                    }
                    tfSampleGroup.reset();
                    tfSampleGroup.setDisabled(true);
                    pnlSampleGroup.setDisabledViaClass(true);

                    tfAnalysisName.reset();
                    tfAnalysisDescription.reset();
                }
            },
            store: strWorkspace,
            valueField: 'FilePath'
        });

        var tfSampleGroup = new Ext.form.TriggerField({
            disabled: true,
            emptyText: 'Type...',
            enableKeyEvents: true,
            listeners: {
                keyup: {
                    buffer: 150,
                    fn: function(field, e) {
                        if( e.ESC == e.getKey() ){
                            field.onTriggerClick();
                        }
                        else {
                            var val = field.getRawValue();

                            if ( TreeFilter != undefined ){
                                TreeFilter.clear();
                            }

                            if ( val != '' ){
                                var re = new RegExp('.*' + val + '.*', 'i');
                                TreeFilter.filter(re, 'text');
                            }
                        }
                    }
                }
            },
            onTriggerClick: function(){
                this.reset();
                if ( TreeFilter != undefined ){
                    TreeFilter.clear();
                }
            },
            triggerClass: 'x-form-clear-trigger'
        });

        var tfAnalysisName = new Ext.form.TriggerField({
            emptyText: 'Type...',
            enableKeyEvents: true,
            listeners: {
                keyup: {
                    buffer: 150,
                    fn: function(field, e) {
                        if( e.ESC == e.getKey() ){
                            field.onTriggerClick();
                        }

                        checkWorkspacesSelection();
                    }
                }
            },
            onTriggerClick: function(){
                this.reset();
            },
            triggerClass: 'x-form-clear-trigger'
        });

        var tfAnalysisDescription = new Ext.form.TriggerField({
            emptyText: 'Type...',
            enableKeyEvents: true,
            listeners: {
                keyup: {
                    buffer: 150,
                    fn: function(field, e) {
                        if( e.ESC == e.getKey() ){
                            field.onTriggerClick();
                        }
                    }
                }
            },
            onTriggerClick: function(){
                this.reset();
            },
            triggerClass: 'x-form-clear-trigger'
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

                var sels = smCheckBoxAnalyses.getSelections(), gsids = [], gspaths = [];
                Ext.each( sels, function( s ){ gsids.push( s.get('gsid') ) });
                Ext.each( sels, function( s ){ gspaths.push( s.get('gspath') ) });

                cnfDeleteAnalysis.inputParams = {
                    gsids:          Ext.encode( gsids ),
                    gspaths:        Ext.encode( gspaths ),
                    container:      sels[0].get('container')
                };

                btnDelete.setDisabled(true);

                maskDelete.show();

                LABKEY.Report.execute( cnfDeleteAnalysis );
            },
            text: 'Delete',
            tooltip: 'Delete an analysis'
        });


        /////////////////////////////////////
        //      Back-end Configuration     //
        /////////////////////////////////////
        var TreeFilter;
        var sampleGroupsTree;

        var cnfSampleGroupsFetching = {
            failure: function( errorInfo, options, responseObj ) {
                unmask();

                LABKEY.ext.OpenCyto.onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/SampleGroups.R',
            success: function( result ) {
                unmask();

                var errors = result.errors;
                var outputParams = result.outputParams;

                if ( errors && errors.length > 0 ){
                    /*
                    msg : errors[0].replace(/\n/g, '<P>'),
                     */

                    LABKEY.ext.OpenCyto.onFailure({
                        exception: errors[0]
                    });
                } else {
                    if ( outputParams.length > 0 ){

                        parseOutputParams( outputParams );

                    } else {
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'No sample groups in the chosen workspace were detected.'
                        });
                    }
                }
            }
        };

        var cnfParse = {
            failure: function( errorInfo, options, responseObj ){
                unmask();

                btnNext.setDisabled(false);

                LABKEY.ext.OpenCyto.onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/OpenCytoPreprocessing.R',
            success: function( result ){
                unmask();

                btnNext.setDisabled(false);

                var errors = result.errors;

                if (errors && errors.length > 0){
                    LABKEY.ext.OpenCyto.onFailure({
                        exception: errors[0]
                    });
                } else {
                    pnlCreate.getLayout().setActiveItem( 0 );
                    btnNext.setText( 'Next >' );
                    btnBack.setDisabled(false);
                    btnBack.setDisabled(true);
                    pnlTabs.setActiveTab( 1 );

                    var toDisplay = result.outputParams[0].value;

                    if ( toDisplay.indexOf('Seems that another session is already working on the same analysis, cannot proceed!') < 0 ){
//                        toDisplay += '\n' + result.console;

                        strGatingSet.reload();
                        pnlTableAnalyses.publish('analysesReload');
                    }

                    Ext.Msg.alert( 'Info', toDisplay );
                }
            }
        };

        var cnfDeleteAnalysis = {
            failure: function( errorInfo, options, responseObj ) {
                maskDelete.hide();

                smCheckBoxAnalyses.clearSelections();

                LABKEY.ext.OpenCyto.onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoPreprocessing/Delete.R',
            success: function( result ) {
                maskDelete.hide();

                var errors = result.errors;
                var outputParams = result.outputParams;

                if (errors && errors.length > 0){
                    smCheckBoxAnalyses.clearSelections();

                    LABKEY.ext.OpenCyto.onFailure({
                        exception: errors[0]
                    });
                } else {
                    var p = outputParams[0];

                    Ext.Msg.alert( 'Info', p.value );
                }

                strGatingSet.reload();
                pnlTableAnalyses.publish('analysesReload');
            }
        };


        /////////////////////////////////////
        //  Panels, Containers, Components //
        /////////////////////////////////////

        var pnlStudyVars = new Ext.Panel({
            autoHeight: true,
            border: false,
            items: {
                autoHeight: true,
                border: false,
                headerCssClass: 'simple-panel-header',
                items: cbStudyVarName,
                layout: 'fit',
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;',
                title: 'Select the study variables that are of interest for this project'
            },
            listeners: {
                afterrender: {
                    fn: function(){
                        maskStudyVars = new Ext.LoadMask( this.getEl(), { msgCls: 'mask-loading' } );
                    },
                    single: true
                }
            },
            title: 'Study variables'
        });

        strStudyVarName.on('load', function(){
            if ( this.getCount() == 0 ){ // at this time 'Select All' has not been added to the store
                cbStudyVarName.setDisabled(true);
                pnlStudyVars.getEl().mask(
                    'Seems like you have not imported any FCS files, click ' +
                    '<a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a>' +
                    ' to do so.' + strngErrorContactWithLink, 'infoMask'
                );
            }
        });


        var pnlTreeHolder = new Ext.Panel({
            items: [],
            layout: 'fit',
            style: 'padding-top: 4px;'
        });


        var cnfPanel = {
            autoHeight: true,
            border: false,
            headerCssClass: 'simple-panel-header',
            layout: 'fit'
        };

        var pnlWorkspace = Ext.apply({
            items: cbWorkspace,
            title: 'Select workspaces: *'
        }, cnfPanel );

        var pnlSampleGroup = new Ext.Panel(
            Ext.apply({
                cls: 'x-item-disabled',
                items: tfSampleGroup,
                setDisabledViaClass: function(bool){
                    if ( bool ){
                        this.addClass('x-item-disabled');
                    } else {
                        this.removeClass('x-item-disabled');
                    }
                },
                title: 'Search for sample group names:'
            }, cnfPanel )
        );

        var pnlAnalysisName = Ext.apply({
            items: tfAnalysisName,
            title: 'Enter analysis name: *'
        }, cnfPanel );

        var pnlAnalysisDescription = Ext.apply({
            items: tfAnalysisDescription,
            title: 'Enter analysis description:'
        }, cnfPanel );

        var pnlControls = new Ext.Panel({
            border: false,
            defaults: {
                border: false,
                forceLayout: true,
                height: 65,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    pack: 'end'
                }
            },
            items: [
                { items: pnlWorkspace },
                { items: pnlSampleGroup },
                { items: pnlAnalysisName },
                { items: pnlAnalysisDescription }
            ],
            style: 'padding-right: 4px;'
        });

        var pnlWorkspaces = new Ext.Panel({
           	autoHeight: true,
            border: false,
            defaults: {
                border: false,
                forceLayout: true,
                hideMode: 'offsets',
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            forceLayout: true,
           	hideMode: 'offsets',
            items: {
                defaults: {
                    flex: 1,
                    forceLayout: true,
                    height: 260
                },
                items: [
                    pnlControls,
                    pnlTreeHolder
                ],
                layout: {
                    type: 'hbox',
                    align: 'stretchmax'
                }
            },
            listeners: {
                afterrender: {
                    fn: function(){
                        maskWorkspaces = new Ext.LoadMask( this.getEl(), { msgCls: 'mask-loading' } );
                    },
                    single: true
                }
            },
            title: 'Workspaces'
        });

        var smCheckBoxFiles = new Ext.grid.CheckboxSelectionModel({
            checkOnly: true,
            filterable: false,
            listeners: {
                selectionchange: updateTableFilesStatus
            },
            sortable: true,
            width: 23
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
                LABKEY.ext.OpenCyto.factoryRowNumberer( strTableFiles ),
                smCheckBoxFiles,
                {
                    dataIndex: 'RunName',
                    dragable: false,
                    header: 'Workspace',
                    hideable: false,
                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                        metaData.attr = 'ext:qtip="' + value + '"';
                        return value;
                    },
                    tooltip: 'Workspace'
                },
                {
                    dataIndex: 'SampleGroup',
                    dragable: false,
                    header: 'Sample Group',
                    hideable: false,
                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                        metaData.attr = 'ext:qtip="' + value + '"';
                        return value;
                    },
                    tooltip: 'Sample Group'
                },
                {
                    dataIndex: 'FileName',
                    dragable: false,
                    header: 'File Name',
                    hideable: false,
                    renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                        metaData.attr = 'ext:qtip="' + value + '"';
                        return value;
                    },
                    tooltip: 'File Name'
                }
            ],
            forceLayout: true,
            headerCssClass: 'simpler-panel-header',
            height: 200,
            loadMask: {
                msg: strngLoadingPhenoData,
                msgCls: 'mask-loading'
            },
            listeners: {
                render: function(){ LABKEY.ext.OpenCyto.initTableQuickTips( this ); }
            },
            plugins: [
                new Ext.ux.grid.AutoSizeColumns(),
                new Ext.ux.grid.GridFilters({
                    encode: false,
                    local: true
                })
            ],
            selModel: smCheckBoxFiles,
            store: strTableFiles,
            stripeRows: true,
            title: 'Files',
//                    view: new Ext.ux.grid.LockingGridView(),
            viewConfig: {
                columnsText: 'Show/hide columns',
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlCompensation = {
           	autoHeight: true,
			border: false,
            defaults: {
                hideMode: 'offsets',
                style: 'padding-top: 4px; padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            forceLayout: true,
           	hideMode: 'offsets',
            items:
                new Ext.form.RadioGroup({
                    autoHeight: true,
                    columns: 1,
                    items: [
                        {
                            boxLabel: 'From workspace',
                            checked: true,
                            inputValue: 1,
                            name: 'compensation'
                        },
                        {
                            boxLabel: 'Manual input',
                            disabled: true,
                            inputValue: 2,
                            name: 'compensation'
                        },
                        {
                            boxLabel: 'Compute automatically',
                            disabled: true,
                            inputValue: 3,
                            name: 'compensation'
                        }
                    ]
                }),
            listeners: {
                afterrender: {
                    fn: function(){
                        maskCompensation = new Ext.LoadMask( this.getEl(), { msgCls: 'mask-loading' } );
                    },
                    single: true
                }
            },
            title: 'Compensation'
        };

        var cmpStatus = new Ext.Component({
            listeners: {
                render: function(){
                    new Ext.ToolTip({
                        target: this.getEl(),
                        listeners: {
                            beforeshow: function(tip) {
                                var msg = this.getEl().dom.innerHTML;
                                tip.update( Ext.util.Format.htmlEncode( msg ) );
                                return (msg.length > 0);
                            },
                            scope: this
                        },
                        renderTo: document.body
                    });
                }
            }
        });

        cmpStatus.addClass( 'extra10pxPaddingLeft' ); // so that this class does not get propagated to the toolbar's overflow menu

        var pnlWorkspacesWrapper = new Ext.Panel({
            items: pnlWorkspaces,
            listeners: {
                activate: function(){
                    this.doLayout();
                }
            }
        });

        var tlbrNavigation = new Ext.Toolbar({
            cls: 'white-background',
            defaults: {
                style: 'padding-top: 1px; padding-bottom: 1px;'
            },
            enableOverflow: true,
            items: [ btnBack, btnNext, cmpStatus ]
        });

        var pnlCreate = new Ext.Panel({
            activeItem: 0,
            bodyStyle: { paddingTop: '1px' },
            border: false,
            defaults: {
                autoHeight: true,
            	forceLayout: true,
                hideMode: 'offsets',
                layout: 'fit'
            },
            deferredRender: false,
            forceLayout: true,
            items: [
                { items: pnlStudyVars },
                pnlWorkspacesWrapper,
                {
                    items: pnlTableFiles,
                    listeners: {
                        afterrender: {
                            fn: function(){
                                maskFiles = new Ext.LoadMask( this.getEl(), { msgCls: 'mask-loading' } );
                            },
                            single: true
                        },
                        render: function(){ LABKEY.ext.OpenCyto.initTableQuickTips( this ); }
                    },
                    title: 'Filter data'
                },
                { items: pnlCompensation }
            ],
            layout: 'card',
            tabTip: 'Create',
            tbar: tlbrNavigation,
            title: 'Create'
        });


        var smCheckBoxAnalyses = new Ext.grid.CheckboxSelectionModel({
            checkOnly: true,
            filterable: false,
            listeners: {
                selectionchange: function(){
                    if ( smCheckBoxAnalyses.getCount() > 0 ){
                        btnDelete.setDisabled(false);
                    } else {
                        btnDelete.setDisabled(true);
                    }
                }
            },
            moveEditorOnEnter: false,
            sortable: true,
            width: 23
        });

        var pnlTableAnalyses = new Ext.grid.EditorGridPanel({
            autoScroll: true,
            columnLines: true,
            columns: [],
            forceLayout: true,
            height: 200,
            loadMask: { msg: 'Loading generated analyses, please, wait...', msgCls: 'mask-loading' },
            listeners: {
                afteredit: function(e){
                    if ( e.field == 'gsname' && e.value == '' ){
                        strGatingSet.rejectChanges();

                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'Blank analysis name is not allowed.<br/>'
                        })
                    } else {
                        strGatingSet.commitChanges();
                    }
                },
                reconfigure: function(){
                    smCheckBoxAnalyses.clearSelections();
                },
                render: function(){
                    LABKEY.ext.OpenCyto.initTableQuickTips( this );
                }
            },
            plugins: [
                new Ext.ux.grid.AutoSizeColumns(),
                new Ext.ux.plugins.CheckBoxMemory({ idProperty: 'gsname' }),
                new Ext.ux.grid.GridFilters({
                    encode: false,
                    local: true,
                    filters: [
                        {
                            dataIndex: 'gsname',
                            type: 'string'
                        },
                        {
                            dataIndex: 'gsdescription',
                            type: 'string'
                        },
                        {
                            dataIndex: 'created',
                            dateFormat: 'Y-m-d H:i:s',
                            type: 'date'
                        }
                    ]
                }),
                new Ext.ux.MsgBus()
            ],
            selModel: smCheckBoxAnalyses,
            store: strGatingSet,
            stripeRows: true,
            tbar: new Ext.Toolbar({
                cls: 'white-background',
                items: btnDelete
            }),
            title: 'Select the analysis to edit',
            viewConfig: {
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });


        var pnlEdit = {
            border: false,
            defaults: {
                autoHeight: true,
                hideMode: 'offsets'
            },
            forceLayout: true,
            items: {
                border: false,
                defaults: {
                    hideMode: 'offsets'
                },
                items: pnlTableAnalyses,
                layout: 'fit'
            },
            layout: 'fit',
            listeners: {
                afterrender: {
                    fn: function(){
                        maskDelete = new Ext.LoadMask(
                            this.getEl(),
                            {
                                msg: 'Deleting the selected analysis and its associated data...',
                                msgCls: 'mask-loading'
                            }
                        );
                    },
                    single: true
                }
            }
        };

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
                    items: pnlEdit,
                    layout: 'fit',
                    tabTip: 'Edit',
                    title: 'Edit'
                }
            ],
            listeners: {
                tabchange: function(tabPanel, tab){
                    if ( tab.title == 'Create' ){
                        if ( pnlCreate.items.indexOf( pnlCreate.getLayout().activeItem ) == 1 ){
                            if ( cbWorkspace.getValue() == '' ){
                                var focusTask = new Ext.util.DelayedTask( cbWorkspace.onTrigger1Click, cbWorkspace );
                                focusTask.delay( 10 );
                            }
                        }
                    }
                }
            },
            minTabWidth: 100,
            resizeTabs: true
        });


        btnBack.mon( btnBack, { click: navHandler.createDelegate( pnlCreate, [-1] ) } );
        btnNext.mon( btnNext, { click: navHandler.createDelegate( pnlCreate, [1] ) } );


        /////////////////////////////////////
        //             Functions           //
        /////////////////////////////////////

        Ext.tree.CustomTreeEventModel = Ext.extend( Ext.tree.TreeEventModel, {
            onCheckboxClick : function(e, node){
                if ( node.getUI().isChecked() ){
                    // Only one sample group per workspace
                    Ext.each( node.parentNode.childNodes, function(n){
                        if ( n != node && n.getUI().isChecked() ){
                            n.getUI().toggleCheck( false );
                        }
                    });
                }

                node.ui.onCheckChange(e);

                tfSampleGroup.reset();
            }
        });

        function parseOutputParams( outputParams ){
            var p = outputParams[0];

            if ( p.type == 'json' ){
                var inputArray = p.value;

                // Convert the computed array into a format that can be consumed by the tree
                var names = cbWorkspace.getCheckedArray( cbWorkspace.displayField ), temp;

                Ext.each( inputArray, function( ws, i, p ){
                    temp = ws;
                    ws = {};
                    ws['children'] = [];

                    for( var sg in temp ){
                        ws['children'].push({
                            text: sg,
                            leaf: true,
                            cls: 'file',
                            checked: false,
                            qtip: temp[sg][0] + ' samples referenced'
                        });
                    };

                    ws['text']      = names[i];
                    ws['leaf']      = false;
                    ws['expanded']  = true;
                    ws['cls']       = 'folder';

                    p[i] = ws;
                });
                // End of conversion

                sampleGroupsTree = new Ext.tree.TreePanel({
                    animate:    true,
                    autoScroll: true,
                    border:     false,
                    enableDD:   false,
                    initComponent : function(){
                        Ext.tree.TreePanel.superclass.initComponent.call(this);

                        if(!this.eventModel){
                            this.eventModel = new Ext.tree.CustomTreeEventModel(this);
                        }

                        var l = this.loader;
                        if(!l){
                            l = new Ext.tree.TreeLoader({
                                dataUrl: this.dataUrl,
                                requestMethod: this.requestMethod
                            });
                        }else if(Ext.isObject(l) && !l.load){
                            l = new Ext.tree.TreeLoader(l);
                        }
                        this.loader = l;

                        this.nodeHash = {};

                        if(this.root){
                            var r = this.root;
                            delete this.root;
                            this.setRootNode(r);
                        }

                        this.addEvents('append','remove','movenode','insert','beforeappend','beforeremove','beforemovenode','beforeinsert','beforeload','load','textchange','beforeexpandnode','beforecollapsenode','expandnode','disabledchange','collapsenode','beforeclick','click','containerclick','checkchange','beforedblclick','dblclick','containerdblclick','contextmenu','containercontextmenu','beforechildrenrendered','startdrag','enddrag','dragdrop','beforenodedrop','nodedrop','nodedragover');
                        if(this.singleExpand){
                            this.mon(this, { beforeexpandnode: this.restrictExpand, scope: this });
                        }
                    },
                    lines:      true,
                    listeners: {
                        checkchange: function(node, checked){

                            // Logic to keep track of selected sample groups and their associated workspaces
                            // Also includes a mechanism to check whether the current selection is valid:
                            // at most one sample group per workspaces is picked

                            var path = strWorkspace.getAt(
                                strWorkspace.findExact( 'FileName', node.parentNode.text )
                            ).get( 'FilePath' );

                            if ( checked ){
                                if ( selectedSampleGroups[path] == undefined ){
                                    selectedSampleGroups[path] = [];
                                } else {
                                    selectedSampleGroupsViolatedCount ++; // array.length > 0
                                }
                                selectedSampleGroups[path].push( node.text );
                            } else { // unchecked
                                if ( selectedSampleGroups[path] != undefined ){
                                    if ( selectedSampleGroups[path].indexOf( node.text ) >= 0 ){
                                        selectedSampleGroups[path].remove( node.text );
                                        if ( selectedSampleGroups[path].length == 0 ){
                                            delete selectedSampleGroups[path];
                                        } else if ( selectedSampleGroups[path].length >= 1 ){
                                            selectedSampleGroupsViolatedCount --;
                                        }
                                    }
                                }
                            }

                            checkWorkspacesSelection();
                        },
                        click: function( node ){
                            if ( ! node.getUI().isChecked() ){

                                // Only one sample group per workspace
                                Ext.each( node.parentNode.childNodes, function(n){
                                    if ( n != node && n.getUI().isChecked() ){
                                        n.getUI().toggleCheck( false );
                                    }
                                });
                            }

                            node.getUI().toggleCheck();

                            tfSampleGroup.reset();
                        }
                    },
                    loader: new Ext.tree.TreeLoader(), // register a TreeLoader to make use of createNode()
                    root: new Ext.tree.AsyncTreeNode({
                        children:   inputArray,
                        draggable:  false,
                        expanded :  true
                    }),
                    rootVisible: false,
                    useArrows: true
                });

                TreeFilter = new Ext.ux.tree.TreeFilterX( sampleGroupsTree );

                pnlTreeHolder.removeAll();
                pnlTreeHolder.add( sampleGroupsTree );
                pnlTreeHolder.doLayout();

                selectedSampleGroups = {};

                lastlySelectedWorkspace = cbWorkspace.getValue();
            }

            if ( outputParams.length > 1 ){
                p = outputParams[1];

                if ( p.type == 'json' ){
                    sampleGroupsMap = p.value;
                }
            }
        };

        function onStrTableFilesLoad(){
            flagLoading = false;

            cbStudyVarName.setDisabled(false);
            cbWorkspace.setDisabled(false);
            tfSampleGroup.setDisabled(false);
            pnlSampleGroup.setDisabledViaClass(false);
            tfAnalysisName.setDisabled(false);
            tfAnalysisDescription.setDisabled(false);

            maskStudyVars.hide();
            maskWorkspaces.hide();


            // Check to see if a different set of study variables was picked or if the sample groups changed
            var tempWorkspaceSampleGroup = '';
            for (var key in selectedSampleGroups){
                tempWorkspaceSampleGroup += key + selectedSampleGroups[key][0];
            }

            var tempStudyVarName = cbStudyVarName.getValue();

            if ( tempStudyVarName != selectedStudyVars || tempWorkspaceSampleGroup != selectedWorkspaceAndSampleGroup ){
                selectedStudyVars = tempStudyVarName;
                selectedWorkspaceAndSampleGroup = tempWorkspaceSampleGroup;

                var curValue, newColumns;

                // Grab the choices array
                var arrayStudyVarsDisplay   = cbStudyVarName.getCheckedArray( cbStudyVarName.displayField ),
                    arrayStudyVarsValue     = cbStudyVarName.getCheckedArray( cbStudyVarName.valueField ); // not encoded path

                var field = { name: 'SampleGroup' };
                field = new Ext.data.Field(field);
                this.recordType.prototype.fields.replace(field);
                this.each( function(r){
                    if ( typeof r.data[field.name] == 'undefined' ){
                        r.data[field.name] = selectedSampleGroups[
                            strWorkspace.getAt(
                                strWorkspace.findExact(
                                    'FileName', r.data['RunName']
                                )
                            ).get( 'FilePath' )
                            ][0];
                    }
                });

                newColumns =
                    [
                        LABKEY.ext.OpenCyto.factoryRowNumberer( strTableFiles ),
                        smCheckBoxFiles,
                        {
                            dataIndex: 'RunName',
                            dragable: false,
                            filter: {
                                options: strTableFiles.collect( 'RunName' ),
                                type: 'list'
                            },
                            header: 'Workspace',
                            hideable: false,
                            renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return '<a href=\'' +
                                    LABKEY.ActionURL.buildURL(
                                        'flow-run',
                                        'showRun',
                                        null,
                                        {
                                            'runId': record.get('RunId'),
                                            'query.showGraphs': 'Thumbnail'
                                        }
                                    ) +
                                    '\' target=\'_blank\'>' + value + '</a>';
                            },
                            tooltip: 'Workspace'
                        },
                        {
                            dataIndex: 'SampleGroup',
                            dragable: false,
                            filter: {
                                options: strTableFiles.collect( 'SampleGroup' ),
                                type: 'list'
                            },
                            header: 'Sample Group',
                            hideable: false,
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Sample Group'
                        },
                        {
                            dataIndex: 'FileName',
                            dragable: false,
                            filter: {
                                type: 'string'
                            },
                            header: 'File Name',
                            hideable: false,
                            renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return '<a href=\'' +
                                    LABKEY.ActionURL.buildURL(
                                        'flow-well',
                                        'showWell',
                                        null,
                                        {
                                            wellId: record.get('FileIdLink')
                                        }
                                    ) +
                                    '\' target=\'_blank\'>' + value + '</a>';
                            },
                            tooltip: 'File Name'
                        }
                    ];

                Ext.each( arrayStudyVarsValue, function(c, index){
                    curValue = LABKEY.QueryKey.encodePart( c ); // need to encode for Labkey to consume

                    newColumns.push({
                        dataIndex: curValue,
                        filter: {
                            options: strTableFiles.collect( curValue ),
                            type: 'list'
                        },
                        header: arrayStudyVarsDisplay[ index ],
                        renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                            metaData.attr = 'ext:qtip="' + value + '"';
                            return value;
                        },
                        tooltip: arrayStudyVarsDisplay[ index ]
                    });
                });

                pnlTableFiles.reconfigure(
                    strTableFiles,
                    new Ext.grid.CustomColumnModel({
                        columns: newColumns,
                        defaults: {
                            resizable: true,
                            sortable: true
                        },
                        disallowMoveBefore: 4
                    })
                );

                smCheckBoxFiles.selectAll();

                if ( strTableFiles.getCount() == 0 ){
                    updateInfoStatus( strngNoSamplesMessage, 1 );

                    LABKEY.Query.executeSql({
                        schemaName: 'flow',
                        sql: this.sql,
                        success: function( data ){
                            if ( data.rowCount == 0 ){
                                // disable all
                                btnNext.setDisabled(true);
                                pnlTableFiles.getEl().mask(
                                    'Seems like you either have not imported any FCS files (click ' +
                                    '<a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>here</a>' +
                                    ' to do so) or while importing a workspace did not associate it to any FCS files (you then need to first ' +
                                    '<a href=\'' + LABKEY.ActionURL.buildURL(
                                        'flow-run',
                                        'showRuns',
                                        null,
                                        {
                                            'query.FCSAnalysisCount~neq': 0
                                        }
                                    ) + '\'>delete</a>' +
                                    ' the workspace and then ' +
                                    '<a href=\'' + LABKEY.ActionURL.buildURL('pipeline', 'browse') + '\'>re-import</a>' +
                                    ' it).' + strngErrorContactWithLink, 'infoMask'
                                );
                            } else {
                                pnlTableFiles.getEl().unmask();
                            }
                        }
                    });
                } else {
                    updateInfoStatus( '' );
                }
            }
        };

        function checkWorkspacesSelection(){
            if (
                selectedSampleGroupsViolatedCount > 0 ||
                $.isEmptyObject( selectedSampleGroups ) ||
                Ext.util.Format.trim( tfAnalysisName.getValue() ) == ''
            ){
                updateInfoStatus( 'At most one sample group per workspace needs to be picked and a non-empty analysis name needs to be specified', -1 );
                btnNext.setDisabled(true);
            } else {
                updateInfoStatus( '' );
                btnNext.setDisabled(false);

                tlbrNavigation.getLayout().unhideItem( cmpStatus ); // neccesity
            }

            tlbrNavigation.doLayout();
        };

        function loadTableFiles(){
            btnNext.setDisabled(true);

            flagLoading = true;

            cbStudyVarName.setDisabled(true);
            cbWorkspace.setDisabled(true);
            tfSampleGroup.setDisabled(true);
            pnlSampleGroup.setDisabledViaClass(true);
            tfAnalysisName.setDisabled(true);
            tfAnalysisDescription.setDisabled(true);

            maskStudyVars.msg = strngLoadingPhenoData;
            maskStudyVars.show();
            maskWorkspaces.msg = strngLoadingPhenoData;
            maskWorkspaces.show();

            strTableFiles.load();
        };

        function obtainSampleGroups(){
            if ( cbWorkspace.getValue() != lastlySelectedWorkspace ){

                btnNext.setDisabled(true);
                if ( TreeFilter != undefined ){
                    TreeFilter.clear();
                }
                tfSampleGroup.reset();

                cnfSampleGroupsFetching.inputParams = {
                    wsPaths: Ext.encode( cbWorkspace.getCheckedArray() )
                };

                mask( 'Obtaining the available sample groups, please, wait...' );

                LABKEY.Report.execute( cnfSampleGroupsFetching );
            } else {
                tfSampleGroup.setDisabled(false);
                pnlSampleGroup.setDisabledViaClass(false);
                sampleGroupsTree.show();
            }
        };

        function processHandler(){
            var filesNames = [], filesIds = [];
            Ext.each( smCheckBoxFiles.getSelections(), function( record ){
                filesNames.push( record.data.FileName );
                filesIds.push( record.data.FileIdMeta );
            });

            var studyVarsArray = [], workspaces = [], sampleGroups = [],
                cm = pnlTableFiles.getColumnModel(),
                cols = cm.columns,
                len = cols.length
                ;

            for ( var i = cm.disallowMoveBefore + 1; i < len; i ++ ){
                if ( ! cols[i].hidden ){
                    studyVarsArray.push( LABKEY.QueryKey.decodePart( cols[i].dataIndex ) ); // need to decode for proper display
                }
            }

            for ( var key in selectedSampleGroups ){
                workspaces.push( key );
                sampleGroups.push( selectedSampleGroups[key][0] );
            }

            cnfParse.inputParams = {
                studyVars:              Ext.encode( studyVarsArray ),
                filesNames:             Ext.encode( filesNames.sort() ),
                filesIds:               Ext.encode( filesIds.sort() ),
                workspacesPaths:        Ext.encode( workspaces ),
                sampleGroupsNames:      Ext.encode( sampleGroups ),
                allStudyVarsString:     cbStudyVarName.getAllValuesAsArray().sort().join(),
                analysisName:           tfAnalysisName.getValue(),
                analysisDescription:    tfAnalysisDescription.getValue()
            };

            LABKEY.Query.selectRows({
                columns: ['RootPath'],
                failure: LABKEY.ext.OpenCyto.onFailure,
                queryName: 'RootPath',
                schemaName: 'flow',
                success: function(data){
                    var count = data.rowCount, i = 1;

                    if ( count > 0 ){
                        var tempPath = data.rows[0].RootPath;

                        for ( i; i < count; i ++ ){
                            tempPath = lcs( tempPath, data.rows[i].RootPath );
                        }

                        if ( tempPath[ tempPath.length - 1 ] == '/' ){
                            tempPath = tempPath.slice( 0, tempPath.length - 1 );
                        } else {
                            tempPath = dirname( tempPath );
                        }
                        cnfParse.inputParams['rootPath'] = tempPath;

                        btnNext.setDisabled(true);

                        mask( 'Generating and saving the analysis data, please, wait...' );
                        LABKEY.Report.execute( cnfParse );
                    } else {
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'Cannot obtain the root paths of the selected files.'
                        });
                    }
                }
            });
        };

        function mask( msg ){

            if ( msg.charAt(0) != 'O' ){ // if obtaining Sample Groups, while they are being fetched
                maskStudyVars.msg = msg; // can go one page back and tingle with the study variables
                maskStudyVars.show();

                cbStudyVarName.setDisabled(true);
            }

            cbWorkspace.setDisabled(true);
            tfSampleGroup.setDisabled(true);
            pnlSampleGroup.setDisabledViaClass(true);
            tfAnalysisName.setDisabled(true);
            tfAnalysisDescription.setDisabled(true);
            if ( sampleGroupsTree != undefined ){
                sampleGroupsTree.setDisabled(true);
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
            cbStudyVarName.setDisabled(false);
            cbWorkspace.setDisabled(false);
            tfSampleGroup.setDisabled(false);
            pnlSampleGroup.setDisabledViaClass(false);
            tfAnalysisName.setDisabled(false);
            tfAnalysisDescription.setDisabled(false);
            if ( sampleGroupsTree != undefined ){
                sampleGroupsTree.setDisabled(false);
            }

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
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                } else if ( code == 1 ){
                    cmpStatus.getEl().setStyle( {color: 'red'} );
                }
                else {
                    cmpStatus.getEl().setStyle( {color: 'black'} );
                    cmpStatus.getEl().frame();
                }
            }
        };

        function updateTableFilesStatus(){
            var selectedCount = smCheckBoxFiles.getCount();

            if ( selectedCount == 1 ){
                pnlTableFiles.setTitle( selectedCount + ' file is currently selected' );
            } else {
                pnlTableFiles.setTitle( selectedCount + ' files are currently selected' );
            }

            if ( selectedCount > 0 ){
                btnNext.setDisabled(false);
                updateInfoStatus( '' );
            } else {
                btnNext.setDisabled(true);
                updateInfoStatus( 'No files selected', -1 );
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
                var arrayStudyVarsDisplay   = cbStudyVarName.getCheckedArray( cbStudyVarName.displayField ),
                    arrayStudyVarsValue     = cbStudyVarName.getCheckedArray( cbStudyVarName.valueField );

                tempSQL = strngSqlStartTable;

                len = arrayStudyVarsDisplay.length;

                for ( i = 0; i < len; i ++ ){
                    curLabel = arrayStudyVarsDisplay[i];
                    curValue = LABKEY.QueryKey.encodePart( arrayStudyVarsValue[i] ); // need to encode for Labkey to consume
                    curFlag = curLabel.slice(-2,-1);

                    if ( curFlag == 'l' ){ // External study variable
                        curLabel = curLabel.slice(0, -11);
                        tempSQL += ', CAST( FCSAnalyses.FCSFile.Sample."' + curLabel + '" AS VARCHAR ) AS "' + curValue + '"';
                    } else if ( curFlag == 'd' ){ // Keyword study variable
                        curLabel = curLabel.slice(0, -10);
                        tempSQL += ', CAST( FCSAnalyses.FCSFile.Keyword."' + curLabel + '" AS VARCHAR ) AS "' + curValue + '"';
                    } else {
                        i = len;
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'there was an error while executing this command: data format mismatch.'
                        });
                    }
                }

                tempSQL += strngSqlEndTable;

                strTableFiles.setSql( tempSQL );


                // Check to see if the sample groups changed
                temp = '';
                for (var key in selectedSampleGroups){
                    temp += key + selectedSampleGroups[key][0];
                }

                if ( temp != selectedWorkspaceAndSampleGroup ){

                    var filterValue = '';
                    for (var key in selectedSampleGroups) {
                        filterValue += sampleGroupsMap[key][ selectedSampleGroups[key][0] ].join(';') + ';';
                    }

                    fileNameFilter =
                        LABKEY.Filter.create(
                            'FileName',
                            filterValue,
                            LABKEY.Filter.Types.IN
                        );

                    strTableFiles.setUserFilters( [ fileNameFilter ] );
                }

                loadTableFiles();

            } else {

                // Check to see if the sample groups changed
                temp = '';
                for (var key in selectedSampleGroups){
                    temp += key + selectedSampleGroups[key][0];
                }

                if ( temp != selectedWorkspaceAndSampleGroup ){

                    var filterValue = '';
                    for (var key in selectedSampleGroups){
                        filterValue += sampleGroupsMap[key][ selectedSampleGroups[key][0] ].join(';') + ';';
                    }

                    fileNameFilter =
                        LABKEY.Filter.create(
                            'FileName',
                            filterValue,
                            LABKEY.Filter.Types.IN
                        );

                    strTableFiles.setUserFilters( [ fileNameFilter ] );

                    loadTableFiles();

                } else { // the case where neither was changed and nothing needs to be changed: neither rows, nor columns of the table
                    if ( strTableFiles.getCount() == 0 ){
                        updateInfoStatus( strngNoSamplesMessage, 1 );

                        btnNext.setDisabled(true);
                    } else {
                        var selectedCount = smCheckBoxFiles.getCount();

                        if ( selectedCount == 0 ){
                            btnNext.setDisabled(true);
                            updateInfoStatus( 'No files selected', -1 );
                        }
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

                checkWorkspacesSelection();

                if ( cbWorkspace.getValue() == '' ){
                    cbWorkspace.focus();
                    cbWorkspace.expand();
                    if ( cbWorkspace.list ){
                        cbWorkspace.restrictHeight();
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
                }
            }

            if ( newIndex == 3 ){
                btnNext.setText('Process >');
                if ( flagCreate ){
                    btnNext.setDisabled(true);
                } else {
                    btnNext.setDisabled(false);
                }
            }

            if ( newIndex == 4 ){
                processHandler();
            }
        };

        $('#' + config.webPartDivId)
            .parents('tr')
            .prev()
            .find('.labkey-wp-title-text')
            .wrap(
                '<a href=\'' +
                LABKEY.ActionURL.buildURL(
                    'reports',
                    'runReport',
                    null,
                    {
                        reportId: 'module:OpenCytoPreprocessing/reports/schemas/OpenCytoPreprocessing.R',
                        tabId: 'Source'
                    }
                ) +
                '\' target=\'_blank\' title=\'Click to open the R source code in a new window\'></a>'
            );

        // jQuery-related


        this.border         = false;
        this.boxMinWidth    = 370;
        this.cls            = 'opencyto';
        this.frame          = false;
        this.items          = pnlTabs;
        this.layout         = 'fit';
        this.renderTo       = config.webPartDivId;
        this.webPartDivId   = config.webPartDivId;
        this.width          = document.getElementById(config.webPartDivId).offsetWidth;

        this.pnlWorkspacesWrapper = pnlWorkspacesWrapper;

        LABKEY.ext.OpenCytoPreprocessing.superclass.constructor.apply(this, arguments);

    }, // end constructor

    resize: function(){
        this.pnlWorkspacesWrapper.doLayout();
    }
}); // end OpenCytoPreprocessing Panel class
