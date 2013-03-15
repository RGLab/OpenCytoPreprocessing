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

/*
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
        console.log("clearing ClearableComboBox");
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
*/

/**
From: http://stackoverflow.com/questions/13830537/extjs4-add-an-empty-option-in-a-combobox
*/
Ext4.define('Ext4.ux.form.field.ClearableComboBox', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.clearcombo',

    trigger2Cls: 'x4-form-clear-trigger',

    initComponent: function () {
        var me = this;


        me.addEvents(
            /**
            * @event beforeclear
            *
            * @param {FilterCombo} FilterCombo The filtercombo that triggered the event
            */
            'beforeclear',
            /**
            * @event beforeclear
            *
            * @param {FilterCombo} FilterCombo The filtercombo that triggered the event
            */
            'clear'
        );

        me.callParent(arguments);

        me.on('specialkey', this.onSpecialKeyDown, me);
        me.on('select', function (me, rec) {
            me.onShowClearTrigger(true); 
        }, me);
        me.on('afterrender', function () { me.onShowClearTrigger(false); }, me);
    },

    /**
    * @private onSpecialKeyDown
    * eventhandler for special keys
    */
    onSpecialKeyDown: function (obj, e, opt) {
        if ( e.getKey() == e.ESC )
        {
            this.clear();
        }
    },

    onShowClearTrigger: function (show) {
        var me = this;

        if (show) {
            me.triggerEl.each(function (el, c, i) {
                if (i === 1) {
                    el.setWidth(el.originWidth, false);
                    el.setVisible(true);
                    me.active = true;
                }
            });
        } else {
            me.triggerEl.each(function (el, c, i) {
                if (i === 1) {
                    el.originWidth = el.getWidth();
                    el.setWidth(0, false);
                    el.setVisible(false);
                    me.active = false;
                }
            });
        }
        // ToDo -> Version specific methods
        if (Ext4.lastRegisteredVersion.shortVersion > 407) {
            me.updateLayout();
        } else {
            me.updateEditState();
        }
    },

    /**
    * @override onTrigger2Click
    * eventhandler
    */
    onTrigger2Click: function (args) {
        this.clear();
    },

    /**
    * @private clear
    * clears the current search
    */
    clear: function () {
        var me = this;
        me.fireEvent('beforeclear', me);
        me.clearValue();
        me.onShowClearTrigger(false);
        me.fireEvent('clear', me);
    }
});