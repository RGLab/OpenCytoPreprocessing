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

Ext.ux.ResizableCombo = Ext.extend(Ext.form.ComboBox, {
    initComponent: function(){
        Ext.ux.ResizableCombo.superclass.initComponent.call(this);
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
    }
});
Ext.reg('resizable-combo', Ext.ux.ResizableCombo);
