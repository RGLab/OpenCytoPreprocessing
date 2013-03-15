/**
 * http://stackoverflow.com/questions/14890330/select-all-in-extjs-4-0-combobox
 */
Ext4.define('comboSelectedCount', {
    alias : 'plugin.selectedCount',
    init : function(combo) {
        var fl = combo.getFieldLabel(), allSelected = false, id = combo.getId() + '-toolbar-panel';

        Ext4.apply(combo, {
            listConfig : {
                tpl : new Ext4.XTemplate('<div id="' + id + '"></div><tpl for="."><div class="x4-boundlist-item">{' + combo.displayField + '} <div class="chkbox"></div></div></tpl>')
            }
        });
        var toolbar = Ext4.create('Ext.toolbar.Toolbar', {
            items : [{
                text : 'Select all',
                icon : '../../ext-4.1.0/resources/themes/images/default/menu/checked.gif',
                handler : function(btn, e) {
                    if (!allSelected) {
                        combo.select(combo.getStore().getRange());
                        combo.setSelectedCount(combo.getStore().getRange().length);
                        btn.setText('Deselect all...');
                        allSelected = true;
                    } else {
                        combo.reset();
                        btn.setText('Select all...');
                        allSelected = false;
                    }
                    e.stopEvent();
                }
            }, '-', {
                xtype : 'textfield',
                enableKeyEvents : true,
                emptyText : 'enter search term',
                listeners : {
                    keyup : function(field, e) {
                        combo.getStore().clearFilter();
                        if (field.getValue()) {
                            // S.E.L - Modified to support inner substring search
                            var re = new RegExp(field.getValue(), "i");
                            combo.getStore().filter(combo.displayField, re);
                        }
                    }
                }
            }]
        });
        combo.on({
            select : function(me, records) {
                var len = records.length, store = combo.getStore();
                combo.setSelectedCount(len);
            },
            beforedeselect : function(me, record, index) {
                me.setFieldLabel(fl);
            },
            expand : {
                fn : function() {
                    var dropdown = Ext4.get(id).dom.parentElement;
                    var container = Ext4.DomHelper.insertBefore(dropdown, '<div id="' + id + '-container"></div>', true);
                    toolbar.render(container);
                },
                single : true
            }
        });
        combo.setSelectedCount = function(count) {
            combo.setFieldLabel(fl + ' (' + count + ' selected)');
        }
    }
}); 