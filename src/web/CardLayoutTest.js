      


Ext4.define('CardLayoutTest', {
    extend : 'Ext.panel.Panel',
    constructor : function(config) {
	config = config || {}; // Make sure config is not totally null.
	config = Ext4.applyIf(config, {
	    // width : 700,
	    height : 120,
	    layout : {
		type : 'card'
	    },
	    defaults: {bodyStyle:'padding:15px'},
    tbar: [
        {
            id: 'move-prev',
            text: '< Back',
            handler: function(btn) {
                navigate(btn.up("panel"), "prev");
            },
            disabled: true
        },
        {
            id: 'move-next',
            text: 'Next >',
            handler: function(btn) {
                navigate(btn.up("panel"), "next");
            }
        }
    ],
    // the panels (or "cards") within the layout
    items: [{
        id: 'card-0',
        html: '<h1>Welcome to the Wizard!</h1><p>Step 1 of 3</p>'
    },{
        id: 'card-1',
        html: '<p>Step 2 of 3</p>'
    },{
        id: 'card-2',
        html: '<h1>Congratulations!</h1><p>Step 3 of 3 - Complete</p>'
    }]
    
	});
	this.callParent([ config ]);
    }
});
    
var navigate =   function(panel, direction){
    // This routine could contain business logic required to manage the navigation steps.
    // It would call setActiveItem as needed, manage navigation button state, handle any
    // branching logic that might be required, handle alternate actions like cancellation
    // or finalization, etc.  A complete wizard implementation could get pretty
    // sophisticated depending on the complexity required, and should probably be
    // done as a subclass of CardLayout in a real-world implementation.
    var layout = panel.getLayout();
    layout[direction]();
    Ext4.getCmp('move-prev').setDisabled(!layout.getPrev());
    Ext4.getCmp('move-next').setDisabled(!layout.getNext());
};