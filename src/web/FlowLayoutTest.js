Ext4.define('FlowLayoutTest', {
    extend : 'Ext.panel.Panel',
    constructor : function(config) {
	config = config || {}; // Make sure config is not totally null.
	config = Ext4.applyIf(config, {
	    // width : 700,
	    height : 500,
	    layout : {
		type : 'column'
	    },
	    defaults: {bodyStyle:'padding:15px'}
	});
	this.callParent([ config ]);
    }
});
