// vim: sw=4:ts=4:nu:nospell:fdc=4
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

// --- A ComboBox with a secondary trigger button that clears the contents of the ComboBox

Ext4.define('Ext.form.ExtJS4ClearableComboBox', {
    extend : 'Ext.ux.ExtJS4ResizableCombo',
    alias: 'clearcombo',
//Ext.form.ExtJS4ClearableComboBox = Ext.extend(Ext.ux.ExtJS4ResizableCombo, {
    initComponent: function() {
        this.triggerConfig = {
            tag:'span', cls:'x-form-twin-triggers', cn:[
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger"},
                {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger x-form-clear-trigger"}
            ]};
        //Ext.form.ExtJS4ClearableComboBox.superclass.initComponent.call(this);
        this.callParent();
    },
    onTrigger2Click : function()
    {
        this.collapse();
        this.reset();                       // clear contents of combobox
        this.fireEvent('cleared');          // send notification that contents have been cleared
    },

    getTrigger:         Ext4.form.TwinTriggerField.prototype.getTrigger,
    initTrigger:        Ext4.form.TwinTriggerField.prototype.initTrigger,
    onTrigger1Click:    Ext.ux.ExtJS4ResizableCombo.prototype.onTriggerClick,
    trigger1Class:      Ext.ux.ExtJS4ResizableCombo.prototype.triggerClass
});
//Ext4.reg('clearcombo', Ext.form.ExtJS4ClearableComboBox);
