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

function removeById(elId) {
    $("#"+elId).remove();
};

function removeByClass(className) {
    $("."+className).remove();
};

function captureEvents(observable) {
    Ext.util.Observable.capture(
            observable,
            function(eventName) {
                console.info(eventName);
            },
            this
    );
};

Ext.namespace('LABKEY', 'LABKEY.ext');

LABKEY.ext.OpenCytoPreprocessing = Ext.extend( Ext.Panel, {

            constructor : function(config) {

                ////////////////////////////////////
                //  Generate necessary HTML divs  //
                ////////////////////////////////////
                $('#' + config.webPartDivId).append(
                        '<ul id="ulSortable' + config.webPartDivId +'" class="bold-centered-text sortable-list"></ul>' +

                        '<div id="divNcdf' + config.webPartDivId + '" class="centered-text">' +
                                '<div style="height: 20px"></div>' +
                        '</div>' +

                        '<div id="divParse' + config.webPartDivId + '" class="centered-text">' +
                                '<div style="height: 20px"></div>' +
                        '</div>' +

                        '<div id="divSampleGroupsFetching' + config.webPartDivId + '" class="centered-text hidden">' +
                                '<div style="height: 20px"></div>' +
                        '</div>' +

                        '<ul id="ulList' + config.webPartDivId + '" class="bold-centered-text ulList">' +
        
                            '<li class="liListDefault">' +
                                '<div id="divXml' + config.webPartDivId + '"></div>' +
                            '</li>' +
        
                            '<li class="liListDefault">' +
                                '<div id="divSampleGroup' + config.webPartDivId + '"></div>' +
                            '</li>' +

                            '<li class="liListDefault">' +
                                '<div id="divGatingSetName' + config.webPartDivId + '"></div>' +
                            '</li>' +

                        '</ul>'
                );

                Ext.Ajax.timeout = 600000;

                /////////////////////////////////////
                //            Variables            //
                /////////////////////////////////////
                var currentComboId;


                /////////////////////////////////////
                //             Strings             //
                /////////////////////////////////////
                var strngErrorContact = '. Please, contact ldashevs@fhcrc.org, if you have questions.';
                var strngErrorContactWithLink = '. Please, contact the <a href="mailto:ldashevs@fhcrc.org?Subject=OpenCytoPreprocessing%20Support">developer</a>, if you have questions.'

                var strngSqlStart = 'SELECT DISTINCT FCSFiles.Name AS FileName';
                var strngSqlEnd =
                        ' FROM FCSFiles' +
                                ' WHERE FCSFiles.Run."Analysis Folder"."Flow Experiment Runs" = true' +
                                ' ORDER BY FileName';


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


                //////////////////////////////////////////////////////////////////
                //             Queries and associated functionality             //
                //////////////////////////////////////////////////////////////////
                // IE 7 compatibility
                Object.keys = Object.keys || (function () {
                    var hasOwnProperty = Object.prototype.hasOwnProperty,
                            hasDontEnumBug = !{toString:null}.propertyIsEnumerable("toString"),
                            DontEnums = [
                                'toString',
                                'toLocaleString',
                                'valueOf',
                                'hasOwnProperty',
                                'isPrototypeOf',
                                'propertyIsEnumerable',
                                'constructor'
                            ],
                            DontEnumsLength = DontEnums.length;

                    return function (o) {
                        if (typeof o != "object" && typeof o != "function" || o === null)
                            throw new TypeError("Object.keys called on a non-object");

                        var result = [];
                        for (var name in o) {
                            if (hasOwnProperty.call(o, name))
                                result.push(name);
                        }

                        if (hasDontEnumBug) {
                            for (var i = 0; i < DontEnumsLength; i++) {
                                if (hasOwnProperty.call(o, DontEnums[i]))
                                    result.push(DontEnums[i]);
                            }
                        }

                        return result;
                    };
                })();


                ///////////////////////////////////
                //            Stores             //
                ///////////////////////////////////
                //    .bindStore(newStore);
                var strSampleGroup = new Ext.data.ArrayStore({
                    autoLoad: false,
                    data: [],
                    fields: [{ name: 'SampleGroup', type: 'string' }]
                });

                var strXML = new LABKEY.ext.Store({
                    autoLoad: true,
                    queryName: 'XmlFiles',
                    remoteSort: false,
                    schemaName: 'exp',
                    sort: 'FileName'
                });

                var strFilteredTable = new LABKEY.ext.Store({
                    autoLoad: false,
                    listeners: {
                        load: function(){
                            cbFileName.selectAll();

                            var inputArray, innerLen, i, outerLen, j, cb, label;

                            var cbsArray = $('.ui-state-default > div:first-child');

                            outerLen = cbsArray.length;
                            for ( i = 0; i < outerLen; i ++ ){
                                cb = Ext.getCmp('cb' + cbsArray[i].id.replace(/pnl/g, '') );
                                if ( cb.getId() != currentComboId ){
                                    label = cb.valueField;
                                    inputArray = strFilteredTable.collect(label);
                                    innerLen = inputArray.length;
                                    for ( j = 0; j < innerLen; j ++ ){
                                        inputArray[j] = [ inputArray[j] ];
                                    }

                                    cb.getStore().loadData( inputArray );
                                }
                            }
                        }
                    },
//                    nullRecord: {
//                        displayColumn: 'myDisplayColumn',
//                        nullCaption: '0'
//                    },
                    schemaName: 'flow',
                    queryName: 'Summary'
                });

                var strStudyVarName = new LABKEY.ext.Store({
                    autoLoad: true,
                    filterArray: [
                        LABKEY.Filter.create('Name', 'DISPLAY;BS;MS', LABKEY.Filter.Types.CONTAINS_NONE_OF),
                        LABKEY.Filter.create('Name', ['$','LASER','EXPORT'], LABKEY.Filter.Types.DOES_NOT_START_WITH)
                    ],
                    queryName: 'Keyword',
                    remoteSort: false,
                    schemaName: 'flow',
                    sort: 'Name'
                });


                /////////////////////////////////////
                //     ComboBoxes / TextFeilds     //
                /////////////////////////////////////
                var cbFileName = new Ext.ux.ResizableLovCombo({
                    addSelectAllItem: false,
                    allowBlank: true,
                    autoSelect: false,
                    displayField: 'FileName',
                    emptyText: 'Select...',
                    forceSelection: true,
                    listeners: {
//                        select: function(){}
                    },
                    minChars: 0,
                    mode: 'local',
                    resizable: true,
                    selectOnFocus: true,
                    store: strFilteredTable,
                    triggerAction: 'all',
                    typeAhead: true,
                    valueDelimeter: ',',
                    valueField: 'FileName'
                });

                var cbStudyVarName = new Ext.ux.form.SuperBoxSelect({
                    allowBlank: true,
                    autoSelect: false,
                    displayField: 'Name',
                    emptyText: 'Select...',
                    forceSelection: true,
                    lazyInit: false,
                    listeners: {
                        additem: function(){
                            btnSetStudyVars.setDisabled(false);
                            btnSetStudyVars.setText('Set study variables');
                        },
                        clear: function(){
                            btnSetStudyVars.setDisabled(false);
                            btnSetStudyVars.setText('Set study variables');
                        },
                        removeitem: function(){
                            btnSetStudyVars.setDisabled(false);
                            btnSetStudyVars.setText('Set study variables');
                        }
                    },
                    minChars: 0,
                    mode: 'local',
                    resizable: true,
                    store: strStudyVarName,
                    triggerAction: 'all',
                    typeAhead: true,
                    valueDelimiter: ';',
                    valueField: 'Name'
                });

                var cbSampleGroup = new Ext.ux.ResizableCombo({
                    allowBlank: true,
                    disabled: true,
                    displayField: 'SampleGroup',
                    emptyText: 'Select...',
                    forceSelection: true,
                    listeners: {
                        select: function(){
                           if ( this.getValue() != '' ){
                               btnParse.setDisabled(false);
                           }
                        }
                    },
                    minChars: 0,
                    mode: 'local',
                    store: strSampleGroup,
                    tpl: '<tpl for="."><div class="x-combo-list-item">{SampleGroup:htmlEncode}</div></tpl>',
                    triggerAction: 'all',
                    typeAhead: true,
                    valueField: 'SampleGroup',
                    width: 220
                });

                var cbXml = new Ext.ux.ResizableCombo({
                    allowBlank: true,
                    displayField: 'FileName',
                    emptyText: 'Select...',
                    forceSelection: true,
                    listeners: {
                        select: function(){
                            maskSampleGroupsFetching.show();

                            var path = cbXml.getValue();
                            wpSampleGroupsFetchingConfig.path = path.replace(/%20/g, ' ').replace(/file:/, '');

                            wpSampleGroupsFetching.render();
                        }
                    },
                    minChars: 0,
                    mode: 'local',
                    store: strXML,
                    tpl: '<tpl for="."><div class="x-combo-list-item">{FileName:htmlEncode}</div></tpl>',
                    triggerAction: 'all',
                    typeAhead: true,
                    valueField: 'FilePath',
                    width: 220
                });

                strSampleGroup.on({
                        'load': function(){
                            cbXml.triggerBlur();
                            cbSampleGroup.focus();
                            cbSampleGroup.expand();
                        }
                });

                var tfGatingSetName = new Ext.form.TextField({
                    allowBlank: true,
                    emptyText: 'Type...',
//                    tpl: '<tpl for="."><div class="x-combo-list-item">{FileName:htmlEncode}</div></tpl>',
                    width: 220
                });


                /////////////////////////////////////
                //             Buttons             //
                /////////////////////////////////////
                var btnNcdf = new Ext.Button({
                    disabled: true,
                    handler: function() {
                        this.setDisabled(true);
                        var divHidden = document.getElementById(cmpNcdf.contentEl);
                        if( divHidden ) { divHidden.innerHTML = 'Processing FCS files, if needed, please, wait...'; }

                        wpNcdfConfig.path = rootPath;

                        wpNcdf.render();
                    },
                    text: 'Generate NetCDF file'
                });

                var btnSetStudyVars = new Ext.Button({
                    handler: setStudyVars,
                    text: 'Set study variables'
                });

                var btnParse = new Ext.Button({
                    disabled: true,
                    handler: function(){
                        this.setDisabled(true);
                        // maskParse.show();

                        wpParseConfig.xmlPath = cbXml.getValue().replace(/%20/g, ' ').replace(/file:/, '');
                        wpParseConfig.sampleGroupName = cbSampleGroup.getValue().replace(/\n/g, '');
                        wpParseConfig.gatingSetName = tfGatingSetName.getValue();

                        wpParse.render();
                    },
                    text: 'Generate gating set'
                });

                // var maskParse = new Ext.LoadMask(btnParse.getEl(), {
                    //msg: "Generating the graphics, please, wait..."
                // });


                /////////////////////////////////////
                //             Web parts           //
                /////////////////////////////////////
                var wpSampleGroupsFetchingConfig = {
                    reportId:'module:OpenCytoPreprocessing/SampleGroups.r',
//                    showSection: 'textOutput', // comment out to show debug output
                    title:'HiddenDiv'
                };

                var wpSampleGroupsFetching = new LABKEY.WebPart({
                    frame: 'none',
                    partConfig: wpSampleGroupsFetchingConfig,
                    partName: 'Report',
                    renderTo: 'divSampleGroupsFetching' + config.webPartDivId,
                    success: function(){
                        maskSampleGroupsFetching.hide();
                        var inputArray = $('#divSampleGroupsFetching' + config.webPartDivId + ' pre')[0].innerHTML;
                        if ( inputArray.search('java.lang.RuntimeException: Failed starting process') < 0 ){
                            if ( inputArray.search('javax.script.ScriptException') < 0 ){
                                cbSampleGroup.setDisabled(false);
                                inputArray = inputArray.split(';');
                                var len = inputArray.length;
                                for ( var i = 0; i < len; i ++ ){
                                    inputArray[i] = [ inputArray[i] ];
                                }
                                strSampleGroup.loadData(inputArray);
                            } else {
                                alert( inputArray.replace(/Execution halted\n/, 'Execution halted') + strngErrorContact );
                            }
                        } else {
                            alert( 'There was an error with starting R, make sure your administrator configured it properly' + strngErrorContact );
                        }
                    }
                });


                var wpNcdfConfig = {
                    reportId:'module:OpenCytoPreprocessing/Ncdf.r',
                    showSection: 'textOutput', // comment out to show debug output
                    title:'HiddenDiv'
                };

                var wpNcdf = new LABKEY.WebPart({
                    frame: 'none',
                    partConfig: wpNcdfConfig,
                    partName: 'Report',
                    renderTo: 'divNcdf' + config.webPartDivId,
                    success: function(){
                        btnNcdf.setDisabled(false);
                    }
                });


                var wpParseConfig = {
                    reportId: 'module:OpenCytoPreprocessing/OpenCytoPreprocessing.r',
                    // showSection: 'textOutput',
                    title: 'ParseDiv'
                };

                var wpParse = new LABKEY.WebPart({
                    frame: 'none',
                    partConfig: wpParseConfig,
                    partName: 'Report',
                    renderTo: 'divParse' + config.webPartDivId,
                    success: function(){
                        btnParse.setDisabled(false);
                        // maskParse.hide();
                    }
                });


                /////////////////////////////////////
                //  Panels, Containers, Components //
                /////////////////////////////////////
                var cmpSampleGroupsFetching = new Ext.Component({
                    autoHeight: true,
                    contentEl: 'divSampleGroupsFetching' + config.webPartDivId
                });

                var cmpNcdf = new Ext.Component({
                    autoHeight: true,
                    contentEl: 'divNcdf' + config.webPartDivId
                });

                var cmpStudyVars = new Ext.Component({
                    html: '<div class="bold-centered-text">Select the study variables that are of interest:</div>'
                });

                var cntXml = new Ext.Container({
                    height: 41,
                    html: 'Select the workspace:',
                    items: [cbXml],
                    layout: 'vbox',
                    renderTo: 'divXml' + config.webPartDivId,
                    width: 220
                });

                var cntSampleGroup = new Ext.Container({
                    height: 41,
                    html: 'Select the sample group:',
                    items: [cbSampleGroup],
                    layout: 'vbox',
                    renderTo: 'divSampleGroup' + config.webPartDivId,
                    width: 220
                });

                var cntGatingSet = new Ext.Container({
                    height: 41,
                    html: 'Enter unique gating set name:',
                    items: [tfGatingSetName],
                    layout: 'vbox',
                    renderTo: 'divGatingSetName' + config.webPartDivId,
                    width: 220
                });

                var pnlFiles = new Ext.Panel({
                    autoHeight: true,
                    cls: 'centered-text',
                    defaults: {
                        style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
                    },
                    hideMode: 'offsets',
                    items: [
                        btnNcdf,
                        cmpNcdf,
                        new Ext.Panel({
                            border: false,
                            contentEl: 'ulList' + config.webPartDivId
                        }),
                        cmpSampleGroupsFetching,
                        btnParse,
                        new Ext.Container({
                            contentEl: 'divParse' + config.webPartDivId
                        })
                    ],
                    listeners: {
                        afterrender: function(){
                            maskSampleGroupsFetching = new Ext.LoadMask(this.getEl(), {
                                msg: "Obtaining the available sample groups, please, wait..."
                            });
                        }
                    },
                    title: 'Files'
                });


                var pnlSelectedStudyVars = new Ext.Panel({
                    border: true,
                    collapsible: true,
                    contentEl: 'ulSortable' + config.webPartDivId,
                    title: '<center>' +
                            'Selected study variables:<br />(drag and drop the study variable\'s name to change the grouping order)' +
                            '</center>'
                });


                var pnlComp = new Ext.Panel({
                    autoHeight: true,
                    defaults: {
                        style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
                    },
                    hideMode: 'offsets',
                    items: [],
                    title: 'Compensation'
                });

                var pnlStudyVars = new Ext.Panel({
                    autoHeight: true,
                    defaults: {
                        style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
                    },
                    hideMode: 'offsets',
                    items: [
                        cmpStudyVars,
                        new Ext.Panel({
                            border: false,
                            items: [ cbStudyVarName ],
                            layout: 'fit'
                        }),
                        btnSetStudyVars,
                        pnlSelectedStudyVars,
                        new Ext.Component({ html: '<div id="filesLabel" class="bold-centered-text">Files</div>' }),
                        new Ext.Panel({
                            border: false,
                            items: [ cbFileName ],
                            layout: 'fit'
                        })
                    ],
                    title: 'Study Variables'
                });

                var pnlTabs = new Ext.TabPanel({
                    activeTab: 0,
                    autoHeight: true,
                    deferredRender: false,
                    items: [ pnlFiles, pnlComp, pnlStudyVars ],
                    width: '100%'
                });


                var maskSampleGroupsFetching;

                /////////////////////////////////////
                //             Functions           //
                /////////////////////////////////////
                function filterFiles(cb){
                    var filterArrayToApply = strFilteredTable.getUserFilters();

                    // Interacting with the same combo box as just before
                    if ( cb.getId() == currentComboId ){
                        filterArrayToApply.pop();
                    }

                    currentComboId = cb.getId();

                    var filesFilter = cb.getCheckedArray();

                    if ( filesFilter.length > 0 ){
                        filterArrayToApply.push( LABKEY.Filter.create(cb.valueField, filesFilter.join(';'), LABKEY.Filter.Types.IN) );
                    }/* else { WHAT TO DO IF NOTHING IS SELECTED!
                     filterArrayToApply = [];
                     }*/

                    strFilteredTable.setUserFilters(filterArrayToApply);
                    strFilteredTable.load();
                };

                function setStudyVars() {
                    var i, j, inputArray, innerLen, len, curElemOrig, curElemMod, tempSQL, newColumns;

                    // Grab the choices array
                    var arrayStudyVars = cbStudyVarName.getValuesAsArray();

                    // Elliminate all of the previous choices
                    $('#ulSortable' + config.webPartDivId).empty();
                    newColumns =
                        [
                            {
                                dataIndex: 'FileName',
                                header: 'File Name',
//                                id: 'FileName',
                                resizable: true,
                                sortable: true
                            }
                        ];
                    tempSQL = strngSqlStart;
                    currentComboId = undefined;
                    strFilteredTable.setUserFilters([]);

                    len = arrayStudyVars.length;

                    for ( i = 0; i < len; i ++ ){
                        curElemOrig = arrayStudyVars[i];
                        curElemMod = curElemOrig.replace(/ /g, '_');

                        tempSQL += ', FCSFiles.Keyword."' + curElemOrig + '" AS ' + curElemMod;

                        $('#ulSortable' + config.webPartDivId).append(
                                '<li class="ui-state-default">' +
                                        '<div id="pnl' + curElemMod + config.webPartDivId + '"></div>' +
                                '</li>'
                        );

                        new Ext.Panel({
                            border: true,
                            headerCssClass: 'draggableHandle',
                            items: [
                                new Ext.ux.ResizableLovCombo({
                                    allowBlank: true,
                                    displayField: curElemMod,
                                    emptyText: 'Select...',
                                    forceSelection: true,
                                    id: 'cb' + curElemMod + config.webPartDivId,
                                    listeners: {
                                        select: function(){
                                            filterFiles(this);
                                        }
                                    },
                                    minChars: 0,
                                    mode: 'local',
                                    resizable: true,
                                    store:
                                            new Ext.data.ArrayStore({
                                                autoLoad: true,
                                                data: [],
                                                fields: [{ name: curElemMod, type: 'string' }],
                                                sortInfo: {
                                                    field: curElemMod,
                                                    direction: 'ASC'
                                                }
                                            })
                                    ,
//                        tpl:'<tpl for=".">' +
//                                '<div class="x-combo-list-item">{[values["' +
//                                this.keyColumn + '"]!==null ? values["' + this.displayColumn + '"] : "' +
//                                (Ext.isDefined(this.lookupNullCaption) ? this.lookupNullCaption : '[other]') +'"]}' +
//                                '</div>' +
//                            '</tpl>',
                                    triggerAction: 'all',
                                    typeAhead: true,
                                    valueField: curElemMod
                                })
                            ],
                            layout: 'fit',
                            renderTo: 'pnl' + curElemMod + config.webPartDivId,
                            title: curElemOrig,
                            tools: closeTool
                        });

                        newColumns.push(
                                {
                                    dataIndex: curElemMod,
                                    header: curElemOrig,
                                    resizable: true,
                                    sortable: true
                                }
                        );

                    } // end of for ( i = 0; i < len; i ++ ) loop

                    tempSQL += strngSqlEnd;

                    strFilteredTable.sql = tempSQL;
                    strFilteredTable.setBaseParam('sql', tempSQL);
                    strFilteredTable.load();

                    btnSetStudyVars.getEl().frame();
                    btnSetStudyVars.setDisabled(true);
                    btnSetStudyVars.setText('Study variables set');
                }; // end of setStudyVars()

                // jQuery-related initializations

                $( '#ulSortable' + config.webPartDivId ).sortable({
                    cancel: '.x-tool-close',
                    forceHelperSize: true,
                    forcePlaceholderSize: true,
                    handle: '.draggableHandle',
                    helper: 'clone',
                    opacity: 0.4,
                    placeholder: 'ui-state-highlight',
                    revert: true,
                    tolerance: 'pointer'
                }).disableSelection().empty();

//    $( '#resultImage-link' ).fancybox();


                function onFailure(errorInfo, options, responseObj){
                    if (errorInfo && errorInfo.exception)
                        alert('Failure: ' + errorInfo.exception + strngErrorContact);
                    else{
                        if ( responseObj != undefined ){
                            alert('Failure: ' + responseObj.statusText + strngErrorContact);
                        } else {
                            alert('Failure: ' + strngErrorContact);
                        }
                    }
                };

                this.border = false;
                this.boxMinWidth = 370;
                this.frame = false;
                this.items = [ pnlTabs ];
                this.layout = 'fit';
                this.renderTo = config.webPartDivId;
                this.webPartDivId = config.webPartDivId;

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
        }
); // end OpenCytoPreprocessing Panel class
