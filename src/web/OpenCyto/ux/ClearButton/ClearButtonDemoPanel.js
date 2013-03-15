(function() {
    Ext.define('app.widgets.ClearButtonDemoPanel', {
                   extend: 'Ext.form.Panel',

                   constructor: function(config) {
                       var comboStore = Ext.create('Ext.data.ArrayStore', {
                                                       fields: [
                                                           {name: 'value'}
                                                       ],
                                                       data: [
                                                           ['male'],
                                                           ['female'],
                                                           ['not sure']
                                                       ]
                                                   });

                       var defaultConfig = {
                           frame:true,
                           title: 'Clear Button Demo Form',
                           width: 260,
                           height: 200,
                           defaultType: 'textfield',
                           fieldDefaults: {
                               labelWidth: 80
                           },
                           items:[
                               {
                                   xtype: 'textfield',
                                   fieldLabel: 'Search',
                                   emptyText: 'Enter search term',
                                   plugins: new Ext.ux.form.field.ClearButton({animateClearButton: false}),
                                   value: 'clear button w/o animation'
                               },
                               {
                                   xtype: 'combo',
                                   plugins: ['clearbutton'],
                                   fieldLabel: 'Select',
                                   displayField: 'value',
                                   store: comboStore,
                                   queryMode: 'local',
                                   typeAhead: true,
                                   value: 'not sure'
                               },
                               {
                                   xtype: 'datefield',
                                   fieldLabel: 'Best Before',
                                   plugins: ['clearbutton'],
                                   value: new Date()
                               },
                               {
                                   xtype: 'textarea',
                                   fieldLabel: 'Notes',
                                   plugins: ['clearbutton'],
                                   value: 'The shincha season, depending upon the region of the plantation, is from early April to late May (around the 88th day after the spring equinox). It is considered that the ideal color of the sencha beverage is a greenish golden color.'
                               }
                           ]
                       };

                       Ext.applyIf(config, defaultConfig);

                       this.callParent(arguments);
                   }
               }
    );

})();
