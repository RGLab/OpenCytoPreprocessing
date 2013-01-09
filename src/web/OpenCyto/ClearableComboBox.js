// --- A ComboBox with a secondary trigger button that clears the contents of the ComboBox
Ext.form.ClearableComboBox = Ext.extend(Ext.ux.ResizableCombo, {
    initComponent: function() {
        this.triggerConfig = {
            tag:'span', cls:'x-form-twin-triggers', cn:[
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger"},
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger x-form-clear-trigger"}
            ]};
        Ext.form.ClearableComboBox.superclass.initComponent.call(this);
    },
    onTrigger2Click : function()
    {
        this.collapse();
        this.reset();                       // clear contents of combobox
        this.fireEvent('cleared');          // send notification that contents have been cleared
    },

    getTrigger:         Ext.form.TwinTriggerField.prototype.getTrigger,
    initTrigger:        Ext.form.TwinTriggerField.prototype.initTrigger,
    onTrigger1Click:    Ext.ux.ResizableCombo.prototype.onTriggerClick,
    trigger1Class:      Ext.ux.ResizableCombo.prototype.triggerClass
});
Ext.reg('clearcombo', Ext.form.ClearableComboBox);
