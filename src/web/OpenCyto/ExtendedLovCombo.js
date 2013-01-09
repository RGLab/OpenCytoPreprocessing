Ext.ux.ExtendedLovCombo = Ext.extend(Ext.ux.form.LovCombo, {
    initComponent: function(){
        this.triggerConfig = {
            tag:'span', cls:'x-form-twin-triggers', cn:[
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger"},
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger x-form-clear-trigger"}
            ]};

        Ext.ux.ExtendedLovCombo.superclass.initComponent.call(this);
        this.on('afterrender', this.resizeToFitContent, this);
        this.store.on({
            'datachanged':  this.resizeToFitContent,
            'add':          this.resizeToFitContent,
            'remove':       this.resizeToFitContent,
            'load':         this.resizeToFitContent,
            'update':       this.resizeToFitContent,
            buffer: 10,
            scope: this
        });
    },
    resizeToFitContent: function(){
        if (!this.elMetrics){
            this.elMetrics = Ext.util.TextMetrics.createInstance(this.getEl());
        }
        var m = this.elMetrics, width = 0, el = this.el, s = this.getSize();
        this.store.each(function (r) {
            var text = r.get(this.displayField);
            width = Math.max(width, m.getWidth( Ext.util.Format.htmlEncode(text) ));
        }, this);
        if (el) {
            width += el.getBorderWidth('lr');
            width += el.getPadding('lr');
        }
        if (this.trigger) {
            width += this.trigger.getWidth();
        }
        s.width = width;
        width += 3*Ext.getScrollBarWidth() + 20;
        this.listWidth = width;
        this.minListWidth = width;
        if ( this.list != undefined ){
            this.list.setSize(width);
        }
        if ( this.innerList != undefined ){
            this.innerList.setSize(width);
        }
    },
    onTrigger2Click : function()
    {
        this.collapse();
        this.reset();                       // clear contents of combobox
        this.fireEvent('cleared');          // send notification that contents have been cleared
    },

    getTrigger:         Ext.form.TwinTriggerField.prototype.getTrigger,
    initTrigger:        Ext.form.TwinTriggerField.prototype.initTrigger,
    onTrigger1Click:    Ext.ux.form.LovCombo.prototype.onTriggerClick,
    trigger1Class:      Ext.ux.form.LovCombo.prototype.triggerClass
});
Ext.reg('extended-lov-combo', Ext.ux.ExtendedLovCombo);
