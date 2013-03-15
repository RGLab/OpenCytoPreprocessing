function init() {

	// ClearButton from:
	// http://www.eekboom.de/ClearButton.html

	var numbers = Ext4.create('Ext.data.Store', {
				fields : ['name', 'digit'],
				data : [{
							"name" : "One",
							"digit" : "1"
						}, {
							"name" : "Two",
							"digit" : "2"
						}, {
							"name" : "Uno is the name of the digit I'm looking for",
							"digit" : "1"
						}]
			});

				var states = Ext4.create('Ext.data.Store', {
				fields : ['abbreviation', 'name'],
				data : [{
							name : 'ALABAMA',
							abbreviation : 'AL'
						}, {
							name : 'ALASKA',
							abbreviation : 'AK'
						}, {
							name : 'AMERICAN SAMOA',
							abbreviation : 'AS'
						}, {
							name : 'ARIZONA',
							abbreviation : 'AZ'
						}, {
							name : 'ARKANSAS',
							abbreviation : 'AR'
						}, {
							name : 'CALIFORNIA',
							abbreviation : 'CA'
						}, {
							name : 'COLORADO',
							abbreviation : 'CO'
						}, {
							name : 'CONNECTICUT',
							abbreviation : 'CT'
						}, {
							name : 'DELAWARE',
							abbreviation : 'DE'
						}, {
							name : 'DISTRICT OF COLUMBIA',
							abbreviation : 'DC'
						}, {
							name : 'FEDERATED STATES OF MICRONESIA',
							abbreviation : 'FM'
						}, {
							name : 'FLORIDA',
							abbreviation : 'FL'
						}, {
							name : 'GEORGIA',
							abbreviation : 'GA'
						}, {
							name : 'GUAM',
							abbreviation : 'GU'
						}, {
							name : 'HAWAII',
							abbreviation : 'HI'
						}, {
							name : 'IDAHO',
							abbreviation : 'ID'
						}, {
							name : 'ILLINOIS',
							abbreviation : 'IL'
						}, {
							name : 'INDIANA',
							abbreviation : 'IN'
						}, {
							name : 'IOWA',
							abbreviation : 'IA'
						}, {
							name : 'KANSAS',
							abbreviation : 'KS'
						}, {
							name : 'KENTUCKY',
							abbreviation : 'KY'
						}, {
							name : 'LOUISIANA',
							abbreviation : 'LA'
						}, {
							name : 'MAINE',
							abbreviation : 'ME'
						}, {
							name : 'MARSHALL ISLANDS',
							abbreviation : 'MH'
						}, {
							name : 'MARYLAND',
							abbreviation : 'MD'
						}, {
							name : 'MASSACHUSETTS',
							abbreviation : 'MA'
						}, {
							name : 'MICHIGAN',
							abbreviation : 'MI'
						}, {
							name : 'MINNESOTA',
							abbreviation : 'MN'
						}, {
							name : 'MISSISSIPPI',
							abbreviation : 'MS'
						}, {
							name : 'MISSOURI',
							abbreviation : 'MO'
						}, {
							name : 'MONTANA',
							abbreviation : 'MT'
						}, {
							name : 'NEBRASKA',
							abbreviation : 'NE'
						}, {
							name : 'NEVADA',
							abbreviation : 'NV'
						}, {
							name : 'NEW HAMPSHIRE',
							abbreviation : 'NH'
						}, {
							name : 'NEW JERSEY',
							abbreviation : 'NJ'
						}, {
							name : 'NEW MEXICO',
							abbreviation : 'NM'
						}, {
							name : 'NEW YORK',
							abbreviation : 'NY'
						}, {
							name : 'NORTH CAROLINA',
							abbreviation : 'NC'
						}, {
							name : 'NORTH DAKOTA',
							abbreviation : 'ND'
						}, {
							name : 'NORTHERN MARIANA ISLANDS',
							abbreviation : 'MP'
						}, {
							name : 'OHIO',
							abbreviation : 'OH'
						}, {
							name : 'OKLAHOMA',
							abbreviation : 'OK'
						}, {
							name : 'OREGON',
							abbreviation : 'OR'
						}, {
							name : 'PALAU',
							abbreviation : 'PW'
						}, {
							name : 'PENNSYLVANIA',
							abbreviation : 'PA'
						}, {
							name : 'PUERTO RICO',
							abbreviation : 'PR'
						}, {
							name : 'RHODE ISLAND',
							abbreviation : 'RI'
						}, {
							name : 'SOUTH CAROLINA',
							abbreviation : 'SC'
						}, {
							name : 'SOUTH DAKOTA',
							abbreviation : 'SD'
						}, {
							name : 'TENNESSEE',
							abbreviation : 'TN'
						}, {
							name : 'TEXAS',
							abbreviation : 'TX'
						}, {
							name : 'UTAH',
							abbreviation : 'UT'
						}, {
							name : 'VERMONT',
							abbreviation : 'VT'
						}, {
							name : 'VIRGIN ISLANDS',
							abbreviation : 'VI'
						}, {
							name : 'VIRGINIA',
							abbreviation : 'VA'
						}, {
							name : 'WASHINGTON',
							abbreviation : 'WA'
						}, {
							name : 'WEST VIRGINIA',
							abbreviation : 'WV'
						}, {
							name : 'WISCONSIN',
							abbreviation : 'WI'
						}, {
							name : 'WYOMING',
							abbreviation : 'WY'
						}]
			});
			
	var myComboStandard = Ext4.create('Ext.form.ComboBox', {
		fieldLabel : 'Choose Name',
		store : numbers,
		queryMode : 'local',
		displayField : 'name',
		valueField : 'digit'
			// plugins:['combo-autowidth']
			// plugins: ['clearbutton'],
			/*
			 * Below is dude's suggestion at Stack Overflow for showing
			 * checkboxes - in combination with CSS. Doesn't seem to work:
			 */
			/*
			 * listConfig : { getInnerTpl : function() { return '<div
			 * class="x-combo-list-item"><img src="' + Ext.BLANK_IMAGE_URL + '"
			 * class="chkCombo-default-icon chkCombo" /> {fieldName} </div>'; } }
			 */
		});

	var resultStandard = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'Standard Ext JS 4 Combo',
				width : 300,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target1',
				items : [myComboStandard, resultStandard]
			});

	myComboStandard.on('select', function(combo, records, eOpts) {
				resultStandard.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////

	var myComboLabKeyBoxSelect = Ext4.create('Ext4.ux.form.field.BoxSelect', {
				fieldLabel : 'Choose Name',
				store : numbers,
				queryMode : 'local',
				displayField : 'name',
				valueField : 'digit',
				plugins : ['combo-autowidth'],
				width : 350
			});

	var resultLabKeyBoxSelect = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'LabKey Box Select Combo',
				width : 500,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target2',
				items : [myComboLabKeyBoxSelect, resultLabKeyBoxSelect]
			});

	myComboLabKeyBoxSelect.on('select', function(combo, records, eOpts) {
				resultLabKeyBoxSelect.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////

	// https://github.com/kveeiv/extjs-boxselect
	var myComboBoxSelect203 = Ext4.create('Ext4.ux.form.field.BoxSelect203', {
		fieldLabel : 'Choose Name',
		//store : numbers,
		//queryMode : 'local',
		//displayField : 'name',
		//valueField : 'digit',
		
				store : states,				
				queryMode : 'local',
			displayField : 'name',
				valueField : 'abbreviation',
				//grow: true,
				//stacked: true,
				
		width : 380,
		plugins : ['clearbutton']
			// plugins: new Ext4.ux.form.field.ClearButton({animateClearButton:
			// false,
			// hideClearButtonWhenEmpty: false,
			// hideClearButtonWhenMouseOut:false})

		});

	var resultBoxSelect203 = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'Box Select Combo - version 2.03',
				width : 500,
				//height : 150,
				bodyPadding : 10,
				renderTo : 'my-target3',
				items : [myComboBoxSelect203, resultBoxSelect203]

			});

	myComboBoxSelect203.on('select', function(combo, records, eOpts) {
				resultBoxSelect203.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////

	// server/internal/webapp/extWidgets/LabkeyCombo.js
	var myComboLabKeyExt4Combo = Ext4.create('LABKEY.ext4.ComboBox', {
				fieldLabel : 'Choose Name',
				store : numbers,
				queryMode : 'local',
				displayField : 'name',
				valueField : 'digit',
				// LabKey turns on combo-autowidth plugin by default.
				// plugins:['combo-autowidth'],
				// width : 50,
				multiSelect : true
			});

	var resultLabKeyExt4Combo = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'LabKey Ext4 Combo',
				width : 500,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target4',
				items : [myComboLabKeyExt4Combo, resultLabKeyExt4Combo]
			});

	myComboLabKeyExt4Combo.on('select', function(combo, records, eOpts) {
				resultLabKeyExt4Combo.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////
	// https://github.com/krikrou/ComboFieldBox

	var myCombo_ComboFieldBox = Ext4.create('Ext4.ux.ComboFieldBox', {
				queryMode : 'local',
				//fieldLabel : 'Choose Name',
				//store : numbers,
				displayField : 'name',
				fieldLabel : 'Choose State',				
				store : states,
				valueField : 'abbreviation',
				plugins : ['selectedCount'],
				// LabKey turns on combo-autowidth plugin by default.
				// plugins:['combo-autowidth'],
				// width : 50,
				width : 300,
				multiSelect : true,
				autoScroll: true
			});

	var result_ComboFieldBox = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'ComboFieldBox',
				width : 500,
				//height : 150,
				bodyPadding : 10,
				renderTo : 'my-target5',
				items : [myCombo_ComboFieldBox, result_ComboFieldBox]
			});

	myCombo_ComboFieldBox.on('select', function(combo, records, eOpts) {
				result_ComboFieldBox.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////
	var myComboLabKeyCheckCombo = Ext4.create('Ext.ux.CheckCombo', {
				addAllSelector : true,
				fieldLabel : 'Choose Name',
				store : numbers,
				queryMode : 'local',
				displayField : 'name',
				valueField : 'digit',
				// LabKey turns on combo-autowidth plugin by default.
				// plugins:['combo-autowidth'],
				// width : 50,
				width : 300,
				multiSelect : true
			});

	var resultLabKeyCheckCombo = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'LabKey CheckCombo',
				width : 500,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target6',
				items : [myComboLabKeyCheckCombo, resultLabKeyCheckCombo]
			});

	myComboLabKeyCheckCombo.on('select', function(combo, records, eOpts) {
				if (records[0]) {
					resultLabKeyCheckCombo.setValue(records[0].data.digit);
				} else {
					resultLabKeyCheckCombo.setValue("");
				}
			});

	// ///////////////////////////////////////////////////////////////////
			
			
			
	var myComboCheckCombo_Jan13_2013 = Ext4.create('Ext4.ux.CheckCombo', {
				addAllSelector : true,
				fieldLabel : 'Choose Name',
				//store : numbers,
				store : states,				
				queryMode : 'local',
				//displayField : 'name',
				//valueField : 'digit',
				displayField : 'name',
				valueField : 'abbreviation',				
				// LabKey turns on combo-autowidth plugin by default.
				// plugins:['combo-autowidth'],
				// width : 50,
				width : 300,
				multiSelect : true
			});

	var resultCheckCombo_Jan13_2013 = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'CheckCombo from January 13, 2013',
				width : 500,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target7',
				items : [myComboCheckCombo_Jan13_2013,
						resultCheckCombo_Jan13_2013]
			});

	myComboCheckCombo_Jan13_2013.on('select', function(combo, records, eOpts) {
				if (records[0]) {
					resultCheckCombo_Jan13_2013.setValue(records[0].data.digit);
				} else {
					resultCheckCombo_Jan13_2013.setValue("");
				}
			});

	// ///////////////////////////////////////////////////////////////////
				


	var myComboSelectedCountPlugin = Ext4.create('Ext.form.ComboBox', {
				disabled : false,
				plugins : ['selectedCount'],
				fieldLabel : 'Choose State',
				labelAlign : 'top',
				store : states,
				queryMode : 'local',
				editable : false,
				displayField : 'name',
				valueField : 'abbreviation',
				// renderTo: Ext.getBody(),
				multiSelect : true,
				maxSelections : 3,
				width : 400
			});

	var resultSelectedCountPlugin = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'State',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'selectedCount plugin',
				width : 500,
				height : 150,
				bodyPadding : 10,
				renderTo : 'my-target8',
				items : [myComboSelectedCountPlugin, resultSelectedCountPlugin]
			});

	myComboSelectedCountPlugin.on('select', function(combo, records, eOpts) {
				if (records[0]) {
					resultSelectedCountPlugin.setValue(records[0].data.abbreviation);
				} else {
					resultSelectedCountPlugin.setValue("");
				}

			});
			
	// ///////////////////////////////////////////////////////////////////

	// https://github.com/kveeiv/extjs-boxselect
	var myComboBoxSelect203SelectedCount = Ext4.create('Ext4.ux.form.field.BoxSelect203', {
		fieldLabel : 'Choose Name',
		//store : numbers,
		//queryMode : 'local',
		//displayField : 'name',
		//valueField : 'digit',
		
				store : states,				
				queryMode : 'local',
			displayField : 'name',
				valueField : 'abbreviation',
				grow: true,
				//stacked: true,
				layout: 'fit',
		width : 380,
		autoScroll: true,
		//plugins : ['clearbutton']
		plugins : ['selectedCount']
			// plugins: new Ext4.ux.form.field.ClearButton({animateClearButton:
			// false,
			// hideClearButtonWhenEmpty: false,
			// hideClearButtonWhenMouseOut:false})

		});

	var resultBoxSelect203SelectedCount = Ext4.create('Ext.form.field.Text', {
				fieldLabel : 'Number',
				value : 'Nothing yet'
			});

	Ext4.create('Ext.form.Panel', {
				title : 'Box Select Combo - version 2.03 with Selected Count Plugin',
				width : 500,
				height : 400,
				bodyPadding : 10,
				renderTo : 'my-target9',
				layout: 'form',
				autoScroll: true,
				items : [myComboBoxSelect203SelectedCount
				//, resultBoxSelect203SelectedCount
				]

			});

	myComboBoxSelect203SelectedCount.on('select', function(combo, records, eOpts) {
				resultBoxSelect203SelectedCount.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////			
}
