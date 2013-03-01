// vim: sw=4:ts=4:nu:nospell:fdc=4
/*
 * Copyright 2012 Fred Hutchinson Cancer Research Center
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

// Ext4.namespace('LABKEY', 'LABKEY.ext');
Ext4.define('LABKEY.ext.ExtJS4OpenCytoPreprocessing', {
	extend : 'Ext.panel.Panel',
	constructor : function(config) {

		config = Ext4.applyIf(config, {
					border : false,
					boxMinWidth : 370,
					frame : false,
					items : [],
					layout : 'fit',
					webPartDivId : config.webPartDivId,
					renderTo : config.webPartDivId,
					width : document.getElementById(config.webPartDivId).offsetWidth
				});

		this.callParent([config]);

	}, // end constructor

	initComponent : function() {
		var me = this;

		this.callParent();

		this.addEvents({
					'preprocessed' : true
				});

		// //////////////////////////////////
		// Generate necessary HTML divs //
		// //////////////////////////////////

		$('#' + me.webPartDivId).append('<div id="wpNcdf' + me.webPartDivId
				+ '" class="centered-text"></div>'

				+ '<div id="wpSampleGroupsFetching' + me.webPartDivId
				+ '" class="centered-text hidden"></div>'

				+ '<div id="wpParse' + me.webPartDivId
				+ '" class="centered-text"></div>'

		);

		// ///////////////////////////////////
		// Variables //
		// ///////////////////////////////////
		var pnlGlobal = this;

		this.rootPath = undefined;
		this.maskGlobal = undefined;
		this.notSorting = undefined;
		this.selectedStudyVars = undefined;

		// ///////////////////////////////////
		// Strings //
		// ///////////////////////////////////
		var strngErrorContactWithLink = ' Please, contact the <a href="mailto:ldashevs@fhcrc.org?Subject=ExtJS4OpenCytoPreprocessing%20Support">developer</a>, if you have questions.';

		// /////////////////////////////////
		// Stores //
		// /////////////////////////////////
		this.strSampleGroup = Ext4.create('Ext.data.ArrayStore', {
					autoLoad : false,
					data : [],
					fields : [{
								name : 'SampleGroup',
								type : 'string'
							}]
				});

		this.strXML = Ext4.create('LABKEY.ext4.data.Store', {
					autoLoad : true,
					listeners : {
						load : function() {
							if (this.getCount() == 0) {
								me.cbXml.disable();
								me.tfAnalysisName.disable();
								pnlWorkspaces.getEl().mask(
										'Seems like you have not imported any XML files, click <a href="'
												+ LABKEY.ActionURL.buildURL(
														'pipeline', 'browse')
												+ '">here</a> to do so.'
												+ strngErrorContactWithLink,
										'infoMask');
							}
						}
					},
					queryName : 'XmlFiles',
					remoteSort : false,
					schemaName : 'exp',
					sort : 'FileName'
				});

		this.strngSqlStartTable = 'SELECT DISTINCT FCSFiles.Name AS FileName';
		this.strngSqlEndTable = ' FROM FCSFiles'
				+ ' WHERE FCSFiles.Run.FCSFileCount != 0 AND FCSFiles.Run.ProtocolStep = \'Keywords\'';

		this.strFilteredTable = Ext4.create('LABKEY.ext4.data.Store', {
					listeners : {
						load : function() {
							console.log('listened to strFilteredTable load event');							
							if (me.notSorting) {
								me.pnlTable.getSelectionModel().selectAll();
								me.notSorting = false;
							}
							me.updateTableStatus();
						}
					},
					// nullRecord: {
					// displayColumn: 'myDisplayColumn',
					// nullCaption: '0'
					// },
					remoteSort : false,
					schemaName : 'flow',
					sortInfo : {
						field : 'FileName',
						direction : 'ASC'
					},
					sql : me.strngSqlStartTable + me.strngSqlEndTable
				});

		// ////////////////////////////////////////////////////////////////
		// Queries and associated functionality //
		// ////////////////////////////////////////////////////////////////
		LABKEY.Query.selectRows({
					columns : ['RootPath'],
					failure : onFailure,
					queryName : 'RootPath',
					schemaName : 'flow',
					success : function(data) {
						var count = data.rowCount;
						if (count == 1) {
							this.rootPath = data.rows[0].RootPath;
						} else if (count < 1) {
							// disable all
							btnNext.disable();
							me.cbStudyVarName.disable();
							me.pnlMain.getEl().mask(
									'Seems like you have not imported any FCS files, click <a href="'
											+ LABKEY.ActionURL.buildURL(
													'pipeline', 'browse')
											+ '">here</a> to do so.'
											+ strngErrorContactWithLink,
									'infoMask');
						} else {
							// disable all
							btnNext.disable();
							me.cbStudyVarName.disable();
							me.pnlMain.getEl().mask(
									'Cannot retrieve the path for the data files: it is non-unique.'
											+ strngErrorContactWithLink,
									'infoMask');
						}
					}
				});

		this.smCheckBox = Ext4.create('Ext.selection.CheckboxModel', {
					// new Ext.grid.CheckboxSelectionModel({
					checkOnly : true,
					listeners : {
						rowdeselect : this.updateTableStatus,
						rowselect : this.updateTableStatus
					},
					sortable : true
				});

		this.rowNumberer = Ext4.create('Ext.grid.RowNumberer', {});
		// new Ext.grid.RowNumberer();

		this.pnlTable = Ext4.create('Ext.grid.Panel', {
					// new Ext.grid.GridPanel({
					autoScroll : true,
					// colModel: new Ext.ux.grid.LockingColumnModel([
					// {
					// dataIndex: 'FileName',
					// header: 'File Name',
					// resizable: true,
					// sortable: true
					// }
					// ]),
					columns : [],
					selModel : this.smCheckBox,
					height : 200,
					loadMask : {
						msg : 'Loading data...',
						msgCls : 'x-mask-loading-custom'
					},
					// plugins: ['autosizecolumns', new
					// Ext.ux.plugins.CheckBoxMemory({ idProperty: 'FileName'
					// })],
					store : me.strFilteredTable,
					stripeRows : true,
					title : 'Files',
					// view: new Ext.ux.grid.LockingGridView(),
					viewConfig : {
						emptyText : 'No rows to display',
						splitHandleWidth : 10
					}
				});

		this.pnlComp = Ext4.create('Ext.Panel', {
			defaults : {
				style : 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
			},
			items : [],
			title : 'Compensation'
		});

		this.add(this.pnlInitMainPanel());

	},

	// ///////////////////////////////////
	// Functions //
	// ///////////////////////////////////
	updateInfoStatus : function(text, code) {
		var me = this;
		me.cmpStatus.update(text);
		if (text != '') {
			if (code == -1) {
				me.cmpStatus.getEl().setStyle({
							color : 'red'
						});
				me.cmpStatus.getEl().frame("ff0000", 1, {
							duration : 3
						}); // RED ERROR
			} else if (code == 1) {
				me.cmpStatus.getEl().setStyle({
							color : 'black'
						});
			} else {
				me.cmpStatus.getEl().setStyle({
							color : 'black'
						});
				me.cmpStatus.getEl().frame();
			}
		}
	},

	updateTableStatus : function() {
		var me = this;

		var selectedCount = me.pnlTable.getSelectionModel().getCount();

		// Update the table's title
		if (selectedCount == 1) {
			me.pnlTable.setTitle(selectedCount + ' file is currently chosen');
		} else {
			me.pnlTable.setTitle(selectedCount + ' files are currently chosen');
		}

		// Manage the 'check all' icon state
		// innerHd doesn't exist in Ext JS 4.
/*
		var t = Ext4.fly(me.pnlTable.getView().innerHd)
				.child('.x-grid4-hd-checker');
		var isChecked = t.hasClass('x-grid4-hd-checker-on');
		var totalCount = me.pnlTable.getStore().getCount();

		if (selectedCount != totalCount & isChecked) {
			t.removeClass('x-grid4-hd-checker-on');
		} else if (selectedCount == totalCount & !isChecked) {
			t.addClass('x-grid4-hd-checker-on');
		}
*/
	},

	setStudyVars : function() {
		var me = this;

		var temp = me.cbStudyVarName.getValue();
		if (temp != me.selectedStudyVars) {
			me.selectedStudyVars = temp;

			var i, len, c, curLabel, curValue, curFlag, tempSQL, newColumns;

			// Grab the choices array
			// getValueEx() defined on SuperBoxSelect
			// var arrayStudyVars = me.cbStudyVarName.getValueEx();

			var arrayStudyVars = [];
			Ext4.each(me.cbStudyVarName.valueModels, function(value) {

						arrayStudyVars.push(value.data);
					});
/*
			newColumns = [me.rowNumberer, me.smCheckBox, {
						dataIndex : 'FileName',
						header : 'File Name'
					}];
*/					
			newColumns = [{dataIndex : 'FileName', header : 'File Name'}];
					
			tempSQL = me.strngSqlStartTable;

			len = arrayStudyVars.length;

			for (i = 0; i < len; i++) {
				c = arrayStudyVars[i];
				https : // www.google.com/search?q=%22ext+js4%22+%22createDelegate%22+convert&ie=utf-8&oe=utf-8&aq=t&rls=org.mozilla:en-US:official&client=firefox-a#hl=en&client=firefox-a&hs=DIa&rls=org.mozilla:en-US%3Aofficial&sclient=psy-ab&q=%22ext+js%22+%22createDelegate%22+convert&oq=%22ext+js%22+%22createDelegate%22+convert&gs_l=serp.3...3257.3257.0.4478.1.1.0.0.0.0.86.86.1.1.0.les%3Bcappsweb..0.0...1.1.5.psy-ab.LXb31BUKlgw&pbx=1&bav=on.2,or.r_gc.r_pw.r_cp.r_qf.&bvm=bv.43148975,d.cGE&fp=edee8122245b3399&biw=1280&bih=856
				curLabel = c.Display;
				curValue = LABKEY.QueryKey.encodePart(c.Value);
				curFlag = curLabel.slice(-2, -1);

				if (curFlag == 'l') { // External study variable
					curLabel = curLabel.slice(0, -11);
					tempSQL += ', FCSFiles.Sample."' + curLabel + '" AS "'
							+ curValue + '"';
					curLabel += ' (External)';
				} else if (curFlag == 'd') { // Keyword study variable
					curLabel = curLabel.slice(0, -10);
					tempSQL += ', FCSFiles.Keyword."' + curLabel + '" AS "'
							+ curValue + '"';
					curLabel += ' (Keyword)';
				} else {
					i = len;
					onFailure({
						exception : 'there was an error while executing this command: data format mismatch.'
					});
				}

				newColumns.push({
							dataIndex : curValue,
							header : curLabel
						});

			} // end of for ( i = 0; i < len; i ++ ) loop

			tempSQL += me.strngSqlEndTable;

			me.strFilteredTablesql = tempSQL;
			me.strFilteredTable.load();

			this.notSorting = true;

			this.pnlTable.reconfigure(me.strFilteredTable, newColumns);
			/*
			this.pnlTable.getStore(), // new
					//Ext.grid.ColumnModel(
						{
						items : newColumns,
						defaults : {
							dragable : false,
							hideable : false,
							resizable : true,
							sortable : true,
							tooltip : 'double click the separator between two column headers to fit the column width to its contents'
						}
					}));
            */
			if (me.cbSampleGroup.getValue() != '' & me.cbXml.getValue() != '') {
				me.btnProcess.setDisabled(false);
			}
		}
	}, // end of setStudyVars()

	pnlInitMainPanel : function() {
		var me = this;
		// ///////////////////////////////////
		// Buttons //
		// ///////////////////////////////////
		me.btnProcess = Ext4.create('Ext.button.Button', {
			disabled : true,
			handler : function() {

				if (me.tfAnalysisName.getValue() == '') {
					me.updateInfoStatus('Empty analysis name is not allowed',
							-1);

					me.tfAnalysisName.focus();
					me.tfAnalysisName.getEl().frame("ff0000", 1, {
								duration : 3
							});
				} else if (me.tfAnalysisDescription.getValue() == '') {
					me.updateInfoStatus(
							'Empty analysis description is not allowed', -1);

					me.tfAnalysisDescription.focus();
					me.tfAnalysisDescription.getEl().frame("ff0000", 1, {
								duration : 3
							});
				} else {
					if (me.cbSampleGroup.getValue() != '') {
						this.setDisabled(true);
						me.cbXml.setDisabled(true);
						me.cbSampleGroup.setDisabled(true);
						me.tfAnalysisName.setDisabled(true);
						me.tfAnalysisDescription.setDisabled(true);

						me.maskGlobal.msg = 'Generating and saving the analysis data, please, wait...';
						me.maskGlobal.show();

						var records = me.pnlTable.getSelectionModel()
								.getSelection();
						var files = [];
						Ext4.each(records, function(record) {
									files.push(record.data.FileName);
								});
						me.wpParseConfig.files = files.join(';');

						me.wpParseConfig.xmlPath = me.wpSampleGroupsFetchingConfig.path;
						me.wpParseConfig.sampleGroupName = me.cbSampleGroup.getValue();
						me.wpParseConfig.analysisName = me.tfAnalysisName
								.getValue();
						me.wpParseConfig.analysisDescription = me.tfAnalysisDescription
								.getValue();
						me.wpParseConfig.studyVars = me.cbStudyVarName
								.getValue();
						me.wpParseConfig.allStudyVars = me.cbStudyVarName
								.getAllValuesAsArray().join();
						me.wpParseConfig.rootPath = Ext4.util.Format
								.undef(this.rootPath);

						me.wpParse.render();
					}
				}

			},
			text : 'Process'
		});

		var btnBack = Ext4.create('Ext.button.Button', {
					disabled : true,
					text : '< Back'
				});

		var btnNext = Ext4.create('Ext.button.Button', {
					text : 'Next >'
				});

		this.cmpStatus = Ext4.create('Ext.Component', {
					html : 'Set the study variables and click \'Next\'',
					style : {
						paddingLeft : '10px'
					}
				});

		this.tableContainer = Ext4.create('Ext.container.Container', {
					items : [this.pnlTable],
					layout : 'fit'
				});

		var pnlMain = Ext4.create('Ext.Panel', {
					activeItem : 0,
					autoHeight : true,
					bodyStyle : {
						paddingTop : '3px'
					},
					border : false,
					defaults : {
						autoHeight : true,
						hideMode : 'offsets'
					},
					deferredRender : false,
					forceLayout : true,
					items : [me.pnlInitStudyVarsPanel(),
							me.pnlInitWorkspacesPanel(), this.tableContainer,
							this.pnlComp],
					layout : 'card',
					listeners : {
						afterrender : function() {
							me.maskGlobal = new Ext4.LoadMask(this.getEl(), {
										msgCls : 'x-mask-loading-custom'
									});
						}
					},
					tbar : Ext4.create('Ext.toolbar.Toolbar', {
								items : [me.btnProcess, btnBack, btnNext,
										me.cmpStatus]
							})

				});

		var navHandler = function(direction) {
			var oldIndex = pnlMain.items
					.indexOf(pnlMain.getLayout().activeItem);
			var newIndex = oldIndex + ((direction === 'next') ? 1 : -1);
			var layout = pnlMain.getLayout();
			layout[direction]();

			if (newIndex == 0) {
				btnBack.setDisabled(true);
				me.btnProcess.setDisabled(true);
			}

			if (newIndex == 1) {
				btnBack.setDisabled(false);
				if (oldIndex == 0) {
					me.setStudyVars();
				}
			}

			// if ( newIndex == 2 ){ btnNext.setDisabled(false); }

			// Disable Next button if there no cards after it, othwise enable
			// it.
			btnNext.setDisabled(!layout.getNext());
			// Disable Comp Panel
			if (newIndex == 3) {
				btnNext.setDisabled(true);
			}

			me.updateInfoStatus('');

		};

		btnBack.on('click', Ext4.bind(navHandler, pnlMain, ["prev"]));
		btnNext.on('click', Ext4.bind(navHandler, pnlMain, ["next"]));

		this.pnlMain = pnlMain;
		// redudnant, yes. Refactor later.
		return pnlMain;
	},

	pnlInitStudyVarsPanel : function() {
		var me = this;
		var listStudyVars = [];

		function fetchKeywords() {
			LABKEY.Query.selectRows({
						columns : ['Name'],
						filterArray : [
								LABKEY.Filter.create('Name', 'DISPLAY;BS;MS',
										LABKEY.Filter.Types.CONTAINS_NONE_OF),
								LABKEY.Filter
										.create(
												'Name',
												['$', 'LASER', 'EXPORT', 'CST',
														'CYTOMETER', 'EXPORT',
														'FJ_', 'CREATOR',
														'TUBE NAME',
														'WINDOW EXTENSION',
														'SPILL'],
												LABKEY.Filter.Types.DOES_NOT_START_WITH)],
						queryName : 'Keyword',
						schemaName : 'flow',
						success : function(data) {
							var toAdd;
							Ext4.each(data.rows, function(r) {
										toAdd = r.Name;
										listStudyVars.push(['K',
												toAdd + ' (Keyword)',
												'RowId/Keyword/' + toAdd]);
									});

							me.strStudyVarName.loadData(listStudyVars);
						},
						failure : onFailure
					});
		}

		LABKEY.Query.getQueries({
					schemaName : 'Samples',
					success : function(queriesInfo) {
						var queries = queriesInfo.queries, count = queries.length, j;
						for (j = 0; j < count; j++) {
							if (queries[j].name == 'Samples') {
								j = count;
							}
						}

						if (j == count + 1) {
							LABKEY.Domain.get(function(DomainDesign) {
										var toAdd;
										Ext4.each(DomainDesign.fields,
												function(r) {
													toAdd = r.name;
													listStudyVars
															.push([
																	'E',
																	toAdd
																			+ ' (External)',
																	'Sample/'
																			+ toAdd]);
												});

										fetchKeywords();
									}, fetchKeywords, 'Samples', 'Samples');
						} else {
							fetchKeywords();
						}
					},
					failure : fetchKeywords
				});

		this.cmpStudyVars = Ext4.create('Ext.Component', {
			cls : 'bold-text',
			html : 'Select the study variables that are of interest for this project:'
		});

		this.strStudyVarName = Ext4.create('Ext.data.ArrayStore', {
					data : [],
					fields : ['Flag', 'Display', 'Value'],
					sortInfo : {
						field : 'Flag',
						direction : 'ASC'
					}
				});

		// ///////////////////////////////////
		// ComboBoxes / TextFields //
		// ///////////////////////////////////
		this.cbStudyVarName =
		// Ext4.create('Ext.ux.form.ExtJS4SuperBoxSelect',{
		Ext4.create('Ext.ux.CheckCombo', {
			multiSelect : true,
			// addAllSelector: true,
			// new Ext.ux.form.SuperBoxSelect({
			allowBlank : true,
			autoSelect : false,
			displayField : 'Display',
			emptyText : 'Select...',
			forceSelection : true,
			getAllValuesAsArray : function() {
				var c = [];

				Ext4.each(this.store.data.items, function(r) {
							c.push(r.data.Value);
						});
				// usedRecords is a variable of the SuperBoxSelect.
				/*
				 * Ext4.each(this.usedRecords.items, function(r) {
				 * c.push(r.data.Value); });
				 */
				return c;
			},
			lazyInit : false,
			listeners : {
				additem : function() {
					me.updateInfoStatus(
							'Set the study variables and click \'Next\'', 1);
				},
				clear : function() {
					me
							.updateInfoStatus('Set the study variables and click \'Next\'');
				},
				// focus: function (){ // display the dropdown on focus
				// this.expand();
				// },
				removeitem : function() {
					me.updateInfoStatus(
							'Set the study variables and click \'Next\'', 1);
				}
			},
			minChars : 0,
			queryMode : 'local',
			resizable : true,
			store : me.strStudyVarName,
			supressClearValueRemoveEvents : true,
			triggerAction : 'all',
			typeAhead : true,
			valueField : 'Value'
		});

		var pnlStudyVars = Ext4.create('Ext.Panel', {
			defaults : {
				style : 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
			},
			items : [me.cmpStudyVars, Ext4.create('Ext.Panel', {
								border : false,
								items : [me.cbStudyVarName],
								layout : 'fit'
							})],
			title : 'Configuration'
		});

		return pnlStudyVars;
	},

	pnlInitWorkspacesPanel : function() {

		var me = this;

		var lastlySelectedXML = undefined;

		// var me.cbXml = Ext4.create('Ext.form.field.ComboBox', {
		me.cbXml = Ext4.create('Ext.form.ExtJS4ClearableComboBox', {
			// new Ext.form.ClearableComboBox({
			allowBlank : true,
			displayField : 'FileName',
			emptyText : 'Select',
			forceSelection : true,
			listeners : {
				change : function() {
					// sample groups obtaining logic here?
					if (this.getValue() == '') {
						me.cbSampleGroup.setDisabled(true);
						me.btnProcess.setDisabled(true);

						this.focus();
					} else {
						me.cbSampleGroup.setDisabled(false);

						if (me.cbSampleGroup.getValue() != '') {
							me.btnProcess.setDisabled(false);

							me.tfAnalysisName.focus(); // working?
						} else {
							me.cbSampleGroup.focus(); // working?
						}
					}
				},
				cleared : function() {
					me.cbSampleGroup.setDisabled(true);
					me.btnProcess.setDisabled(true);
					this.focus();
				},
				select : function(c, r, i) {
					var value = this.getValue();

					if (value != lastlySelectedXML) {

						me.maskGlobal.msg = 'Obtaining the available sample groups, please, wait...';
						me.maskGlobal.show();

						this.setDisabled(true); // to prevent interaction with
						// that combo while the mask is
						// on
						me.tfAnalysisName.setDisabled(true); // to prevent
						// interaction
						// with that
						// combo while
						// the mask is
						// on
						me.tfAnalysisDescription.setDisabled(true); // to
						// prevent
						// interaction
						// with that
						// combo
						// while the
						// mask is
						// on
						// do we need to also disable the navigation buttons ?

						// when we have an example with multiple xml workspaces,
						// then probably need to clear out the me.cbSampleGroup
						// ('s store)

						me.wpSampleGroupsFetchingConfig.path = decodeURI(value)
								.slice(5);

						wpSampleGroupsFetching.render();
					} else {
						me.cbSampleGroup.setDisabled(false);

						if (me.cbSampleGroup.getValue() != '') {
							me.btnProcess.setDisabled(false);

							this.triggerBlur();

							me.tfAnalysisName.focus();
						} else {
							this.triggerBlur();

							me.cbSampleGroup.focus();
						}
					}
				}
			},
			minChars : 0,
			mode : 'local',
			store : me.strXML,

			// tpl: '<tpl for="."><div
			// class="x-combo-list-item">{FileName:htmlEncode}</div></tpl>',
			triggerAction : 'all',
			typeAhead : true,
			valueField : 'FilePath',

			width : 200
		});

		me.cbSampleGroup = Ext4.create('Ext.form.ExtJS4ClearableComboBox', {
					// me.cbSampleGroup = new Ext.form.ClearableComboBox({

					allowBlank : true,
					disabled : true,
					displayField : 'SampleGroup',
					emptyText : 'Select...',
					forceSelection : true,
					listeners : {
						change : function() {
							if (this.getValue() != '') {
								me.btnProcess.setDisabled(false);

								me.tfAnalysisName.focus(); // working?
							} else {
								me.btnProcess.setDisabled(true);

								this.focus();
							}
						},
						cleared : function() {
							me.btnProcess.setDisabled(true);

							this.focus();
						},
						select : function() {
							me.btnProcess.setDisabled(false);

							this.triggerBlur();

							me.tfAnalysisName.focus();
						}
					},
					minChars : 0,
					mode : 'local',
					store : me.strSampleGroup,
					// tpl: '<tpl for="."><div
					// class="x-combo-list-item">{SampleGroup:htmlEncode}</div></tpl>',
					triggerAction : 'all',
					typeAhead : true,
					valueField : 'SampleGroup',
					width : 200
				});

		me.strSampleGroup.on({
					'load' : function() {
						me.cbSampleGroup.focus();
						me.cbSampleGroup.expand();
						console.log("listened to strSampleGroup load event");
					}
				});

		me.strSampleGroup.on({
			'datachanged' : function() {
				me.cbSampleGroup.focus();
				me.cbSampleGroup.expand();
				console
						.log("listened to strSampleGroup store datachanged event");
			}
		});

		me.tfAnalysisName = Ext4.create('Ext.form.TextField', {
					allowBlank : true,
					emptyText : 'Type...',
					width : 200
				});

		me.tfAnalysisDescription = Ext4.create('Ext.form.TextField', {
					allowBlank : true,
					emptyText : 'Type...',
					width : 200
				});

		// ///////////////////////////////////
		// Web parts //
		// ///////////////////////////////////
		this.wpSampleGroupsFetchingConfig = {
			reportId : 'module:OpenCytoPreprocessing/SampleGroups.r',
			// showSection: 'textOutput', // comment out to show debug output
			title : 'HiddenDiv'
		};

		var wpSampleGroupsFetching = new LABKEY.WebPart({
					failure : function(errorInfo, options, responseObj) {
						me.maskGlobal.hide();

						me.cbXml.setDisabled(false);
						me.tfAnalysisName.setDisabled(false);
						me.tfAnalysisDescription.setDisabled(false);

						onFailure(errorInfo, options, responseObj);
					},
					frame : 'none',
					partConfig : me.wpSampleGroupsFetchingConfig,
					partName : 'Report',
					renderTo : 'wpSampleGroupsFetching' + me.webPartDivId,
					success : function() {
						me.maskGlobal.hide();

						me.cbXml.setDisabled(false);
						me.tfAnalysisName.setDisabled(false);
						me.tfAnalysisDescription.setDisabled(false);

						var inputArray = $('#wpSampleGroupsFetching'
								+ me.webPartDivId + ' pre')[0].innerHTML;
						console.log("inputArray for sample group store");
						console.log(inputArray);
						if (inputArray.search('java.lang.RuntimeException') < 0) {
							if (inputArray
									.search('javax.script.ScriptException') < 0) {
								me.cbSampleGroup.setDisabled(false);
								inputArray = inputArray.replace(/\n/g, '')
										.replace('All Samples;', '').split(';');

								var len = inputArray.length;
								for (var i = 0; i < len; i++) {
									inputArray[i] = [inputArray[i]];
								}
								me.strSampleGroup.loadData(inputArray);

								lastlySelectedXML = me.cbXml.getValue();
							} else {
								onFailure({
											exception : inputArray.replace(
													/Execution halted\n/,
													'Execution halted')
										});
							}
						} else {
							onFailure({
										exception : inputArray
									});
						}
					}
				});

		this.wpParseConfig = {
			reportId : 'module:OpenCytoPreprocessing/OpenCytoPreprocessing.r',
			// showSection: 'textOutput', // comment out to show debug output
			title : 'ParseDiv'
		};

		this.wpParse = new LABKEY.WebPart({
					failure : function(errorInfo, options, responseObj) {
						me.maskGlobal.hide();

						me.cbXml.setDisabled(false);
						me.cbSampleGroup.setDisabled(false);
						me.tfAnalysisName.setDisabled(false);
						me.tfAnalysisDescription.setDisabled(false);

						me.btnProcess.setDisabled(false);

						onFailure(errorInfo, options, responseObj);
					},
					frame : 'none',
					partConfig : me.wpParseConfig,
					partName : 'Report',
					renderTo : 'wpParse' + this.webPartDivId,
					success : function() {
						me.maskGlobal.hide();

						me.cbXml.setDisabled(false);
						me.cbSampleGroup.setDisabled(false);
						me.tfAnalysisName.setDisabled(false);
						me.tfAnalysisDescription.setDisabled(false);

						me.btnProcess.setDisabled(false);

						// var activeIndex = this.items.indexOf(
						// this.getLayout().activeItem ) + direction;
						me.pnlMain.getLayout().setActiveItem(1);

						me.fireEvent('preprocessed');
					}
				});

		// ///////////////////////////////////
		// Panels, Containers, Components //
		// ///////////////////////////////////

		var pnlWorkspace = Ext4.create('Ext.Panel', {
					border : false,
					headerCssClass : 'simple-panel-header',
					items : [me.cbXml],
					layout : 'fit',
					title : 'Select the workspace:'
				});

		var pnlSampleGroup = Ext4.create('Ext.Panel', {
					border : false,
					headerCssClass : 'simple-panel-header',
					items : [me.cbSampleGroup],
					layout : 'fit',
					title : 'Select the sample group:'
				});

		var pnlAnalysisName = Ext4.create('Ext.Panel', {
					border : false,
					headerCssClass : 'simple-panel-header',
					items : [me.tfAnalysisName],
					layout : 'fit',
					title : 'Enter analysis name:'
				});

		var pnlAnalysisDescription = Ext4.create('Ext.Panel', {
					border : false,
					headerCssClass : 'simple-panel-header',
					items : [me.tfAnalysisDescription],
					layout : 'fit',
					title : 'Enter analysis description:'
				});

		var pnlList = Ext4.create('Ext.Panel', {
					border : false,
					layout : {
						type : 'column'
					},
					defaults : {
						bodyStyle : 'padding:15px',
						width : 200
					},
					id :
					// contentEl:
					'ulList' + this.webPartDivId,
					items : [pnlWorkspace, pnlSampleGroup, pnlAnalysisName,
							pnlAnalysisDescription
					]
				});

		var pnlWorkspaces = Ext4.create('Ext.Panel', {
			defaults : {
				hideMode : 'visibility', // ? why not offsets ?
				style : 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
			},
			// disabled: true,
			// forceLayout: true,
			items : [
					pnlList, Ext4.create('Ext.Component', {
								id :
								// contentEl:
								'wpSampleGroupsFetching' + this.webPartDivId
							}), Ext4.create('Ext.Component', {
								id :
								// contentEl:
								'wpParse' + this.webPartDivId
							})
			],
			title : 'Workspaces'
		});
		return pnlWorkspaces;
	},

	resize : function() {
		// webPartContentWidth =
		// document.getElementById(this.webPartDivId).offsetWidth;

		// if ( typeof resizableImage != 'undefined' ){
		// if ( $('#resultImage').width() > 2/3*pnlStudyVars.getWidth() ){
		// resizableImage.resizeTo( 2/3*pnlStudyVars.getWidth(),
		// 2/3*pnlStudyVars.getWidth() );
		// }
		// }
	}
}); // end ExtJS4OpenCytoPreprocessing Panel class
