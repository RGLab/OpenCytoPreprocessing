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
				layout: 'form',
		width : 380,
		//plugins : ['clearbutton']
		plugins : ['selectedCount'],
		autoScroll: true
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
				//height : 400,
				bodyPadding : 10,
				renderTo : 'my-target9',
				autoScroll: true,
				layout: 'form',
				items : [myComboBoxSelect203SelectedCount
				//, resultBoxSelect203SelectedCount
				]

			});

	myComboBoxSelect203SelectedCount.on('select', function(combo, records, eOpts) {
				resultBoxSelect203SelectedCount.setValue(records[0].data.digit);
			});

	// ///////////////////////////////////////////////////////////////////			
}
