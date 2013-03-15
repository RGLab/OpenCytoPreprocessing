/**
 * From: http://www.sencha.com/forum/showthread.php?198862-Ext.ux.CheckCombo
 * http://extjs.dariofilkovic.com/
 * Version from: January 14 2003
 */
Ext4.define('Ext4.ux.CheckCombo', {
    extend : 'Ext.form.field.ComboBox',
    alias : 'widget.checkcombo',
    multiSelect : true,
    allSelector : false,
    noData : false,
    noDataText : 'No combo data',
    addAllSelector : false,
    allSelectorHidden : false,
    enableKeyEvents : true,
    afterExpandCheck : false,
    allText : 'All',
    oldValue : '',
    listeners : {
        /* uncomment if you want to reload store on every combo expand
         beforequery: function(qe)
         {
         this.store.removeAll();
         delete qe.combo.lastQuery;
         },
         */
        focus : function(cpt) {
            cpt.oldValue = cpt.getValue();
        },
        keydown : function(cpt, e, eOpts) {
            var value = cpt.getRawValue(), oldValue = cpt.oldValue;

            if (value != oldValue)
                cpt.setValue('');
        }
    },
    createPicker : function() {
        var me = this, picker, menuCls = Ext4.baseCSSPrefix + 'menu', opts = Ext4.apply({
            pickerField : me,
            selModel : {
                mode : me.multiSelect ? 'SIMPLE' : 'SINGLE'
            },
            floating : true,
            hidden : true,
            ownerCt : me.ownerCt,
            cls : me.el.up('.' + menuCls) ? menuCls : '',
            store : me.store,
            displayField : me.displayField,
            focusOnToFront : false,
            pageSize : me.pageSize,
            tpl : ['<ul><tpl for=".">', '<li role="option" class="' + Ext4.baseCSSPrefix + 'boundlist-item"><span class="x4-combo-checker">&nbsp;</span> {' + me.displayField + '}</li>', '</tpl></ul>']
        }, me.listConfig, me.defaultListConfig);

        picker = me.picker = Ext4.create('Ext.view.BoundList', opts);
        if (me.pageSize) {
            picker.pagingToolbar.on('beforechange', me.onPageChange, me);
        }

        me.mon(picker, {
            itemclick : me.onItemClick,
            refresh : me.onListRefresh,
            scope : me
        });

        me.mon(picker.getSelectionModel(), {
            'beforeselect' : me.onBeforeSelect,
            'beforedeselect' : me.onBeforeDeselect,
            'selectionchange' : me.onListSelectionChange,
            scope : me
        });

        me.store.on('load', function(store) {
            if (store.getTotalCount() == 0) {
                me.allSelectorHidden = true;
                if (me.allSelector != false)
                    me.allSelector.setStyle('display', 'none');
                if (me.noData != false)
                    me.noData.setStyle('display', 'block');
            } else {
                me.allSelectorHidden = false;
                if (me.allSelector != false)
                    me.allSelector.setStyle('display', 'block');
                if (me.noData != false)
                    me.noData.setStyle('display', 'none');
            }
        });

        return picker;
    },
    reset : function() {
        var me = this;

        me.setValue('');
    },
    setValue : function(value) {
        this.value = value;
        if (!value) {
            if (this.allSelector != false)
                this.allSelector.removeCls('x4-boundlist-selected');
            return this.callParent(arguments);
        }

        if ( typeof value == 'string') {
            var me = this, records = [], vals = value.split(',');

            if (value == '') {
                if (me.allSelector != false)
                    me.allSelector.removeCls('x4-boundlist-selected');
            } else {
                if (vals.length == me.store.getCount() && vals.length != 0) {
                    if (me.allSelector != false)
                        me.allSelector.addCls('x4-boundlist-selected');
                    else
                        me.afterExpandCheck = true;
                }
            }

            Ext4.each(vals, function(val) {
                var record = me.store.getById(parseInt(val));
                if (record)
                    records.push(record);
            });

            return me.setValue(records);
        } else
            return this.callParent(arguments);
    },
    getValue : function() {
        if ( typeof this.value == 'object')
            return this.value.join(',');
        else
            return this.value;
    },
    getSubmitValue : function() {
        return this.getValue();
    },
    expand : function() {
        var me = this, bodyEl, picker, collapseIf;

        if (me.rendered && !me.isExpanded && !me.isDestroyed) {
            bodyEl = me.bodyEl;
            picker = me.getPicker();
            collapseIf = me.collapseIf;

            // show the picker and set isExpanded flag
            picker.show();
            me.isExpanded = true;
            me.alignPicker();
            bodyEl.addCls(me.openCls);

            if (me.noData == false) {
                me.noData = picker.getEl().down('.x4-boundlist-list-ct').insertHtml('beforeBegin', '<div class="x4-boundlist-item" role="option">' + me.noDataText + '</div>', true);                
            }

            if (me.addAllSelector == true && me.allSelector == false) {
                me.allSelector = picker.getEl().down('.x4-boundlist-list-ct').insertHtml('beforeBegin', '<div class="x4-boundlist-item" role="option"><span class="x4-combo-checker">&nbsp;</span> ' + me.allText + '</div>', true);                
                me.allSelector.on('click', function(e) {
                    if (me.allSelector.hasCls('x4-boundlist-selected')) {
                        me.allSelector.removeCls('x4-boundlist-selected');
                        me.setValue('');
                        me.fireEvent('select', me, []);
                    } else {
                        var records = [];
                        me.store.each(function(record) {
                            records.push(record);
                        });
                        me.allSelector.addCls('x4-boundlist-selected');
                        me.select(records);
                        me.fireEvent('select', me, records);
                    }
                });

                if (me.allSelectorHidden == true)
                    me.allSelector.hide();
                else
                    me.allSelector.show();

                if (me.afterExpandCheck == true) {
                    me.allSelector.addCls('x4-boundlist-selected');
                    me.afterExpandCheck = false;
                }
            }

            // monitor clicking and mousewheel
            me.mon(Ext4.getDoc(), {
                mousewheel : collapseIf,
                mousedown : collapseIf,
                scope : me
            });
            Ext4.EventManager.onWindowResize(me.alignPicker, me);
            me.fireEvent('expand', me);
            me.onExpand();
        } else {
            me.fireEvent('expand', me);
            me.onExpand();
        }
    },
    alignPicker : function() {
        var me = this, picker = me.getPicker();

        me.callParent();

        if (me.addAllSelector == true) {
            var height = picker.getHeight();
            height = parseInt(height) + 20;
            picker.setHeight(height);
            picker.getEl().setStyle('height', height + 'px');
        }
    },
    onListSelectionChange : function(list, selectedRecords) {
        var me = this, isMulti = me.multiSelect, hasRecords = selectedRecords.length > 0;
        // Only react to selection if it is not called from setValue, and if our list is
        // expanded (ignores changes to the selection model triggered elsewhere)
        if (!me.ignoreSelection && me.isExpanded) {
            if (!isMulti) {
                Ext4.defer(me.collapse, 1, me);
            }
            /*
             * Only set the value here if we're in multi selection mode or we have
             * a selection. Otherwise setValue will be called with an empty value
             * which will cause the change event to fire twice.
             */
            if (isMulti || hasRecords) {
                me.setValue(selectedRecords, false);
            }
            if (hasRecords) {
                me.fireEvent('select', me, selectedRecords);
            }
            me.inputEl.focus();

            if (me.addAllSelector == true && me.allSelector != false) {
                if (selectedRecords.length == me.store.getTotalCount())
                    me.allSelector.addCls('x4-boundlist-selected');
                else
                    me.allSelector.removeCls('x4-boundlist-selected');
            }
           
        }
    }
}); 