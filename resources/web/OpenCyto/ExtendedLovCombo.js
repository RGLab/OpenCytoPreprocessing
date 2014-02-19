Ext.ux.form.ExtendedLovCombo = Ext.extend( Ext.ux.form.LovCombo, {

    // True to show the drop down list when the text field is clicked, not just the trigger
    expandOnFocus: true,

    //True for use selectAll item
    addSelectAllItem: true,

    //True to add the extra Clear trigger button
    addClearItem: true,

    //Value of valueField for selectAll item
    selectAllValueField: '_all',

    //Value of textField for selectAll item
    selectAllTextField: 'Select all',

    //Toggle selectAll item
    allSelected: false,

    //css class for selactAll item : ux-lovcombo-list-item-all
    initComponent: function() {

        // template with checkbox
        if ( ! this.tpl ) {
            this.tpl = new Ext.XTemplate(
                '<tpl for=".">'
                    + '<tpl if="' + this.displayField + '==\'' + this.selectAllTextField + '\'">'
                        + '<div class=\'x-combo-list-item ux-lovcombo-list-item-all\'>'
                            + '<img src=\'' + Ext.BLANK_IMAGE_URL + '\' '
                            + 'class=\'ux-lovcombo-icon ux-lovcombo-icon-'
                            + '{[values.' + this.checkField + '?\'checked\':\'unchecked\'' + ']}\'>'
                            + '<div class=\'ux-lovcombo-item-text\'>' + this.selectAllTextField + '</div>'
                        + '</div>'
                    + '</tpl>'
                    + '<tpl if="' + this.displayField + '!=\'' + this.selectAllTextField + '\'">'
                        + '<div class=\'x-combo-list-item\'>'
                            + '<img src=\'' + Ext.BLANK_IMAGE_URL + '\' '
                            + 'class=\'ux-lovcombo-icon ux-lovcombo-icon-'
                            + '{[values.' + this.checkField + '?\'checked\':\'unchecked\'' + ']}\'>'
                            + '<div class=\'ux-lovcombo-item-text\'>{' + this.displayField + ':this.process}</div>'
                        + '</div>'
                    + '</tpl>'
                 +'</tpl>',
                {
                    process : function(value) {
                        return value === '' ? '&nbsp' : Ext.util.Format.htmlEncode( value );
                    }
                }
            );
        }

        // Add selected value tool tip
        this.mon( this, {
            afterrender: function(){
                new Ext.ToolTip({
                    target: this.getEl(),
                    html: this.getValue(),
                    listeners: {
                        beforeshow: function(tip) {
                            var msg = this.getRawValue();
                            tip.update( Ext.util.Format.htmlEncode( msg ) );
                            return (msg.length > 0);
                        },
                        scope: this
                    },
                    renderTo: document.body
                });

                if ( this.expandOnFocus ){
                    this.mon( this.getEl(), {
                        click: function(){
                            if ( ! this.isExpanded() ){
                                this.initList();
                                if( this.triggerAction == 'all' ) {
                                    this.doQuery( this.allQuery, true );
                                } else {
                                    this.doQuery( this.getRawValue() );
                                }
                            } else {
                                this.collapse();
                            }
                        },
                        scope: this
                    });
                }

                this.resizeToFitContent();
            },
            scope: this,
            single: true
        });

        if ( this.store ){
            this.mon(
                this.store, {
                    datachanged:  this.resizeToFitContent,
                    add:          this.resizeToFitContent,
                    remove:       this.resizeToFitContent,
                    load:         this.resizeToFitContent,
                    update:       this.resizeToFitContent,
                    buffer: 10,
                    scope: this
                }
            );
        }

        // install internal event handlers
        this.mon( this, {
            beforequery:    this.onBeforeQuery,
            scope: this
        });

        // remove selection from input field
        this.onLoad = this.onLoad.createSequence(function() {
            if(this.el) {
                var v = this.el.dom.value;
                this.el.dom.value = '';
                this.el.dom.value = v;
            }
        });

        this.mon(
            this.store, {
                load: function(){
                    this.initSelectAll();
                },
                buffer: 10,
                scope: this
            }
        );

        this.initSelectAll();

        this.addClearItem
            ? Ext.form.TwinTriggerField.prototype.initComponent.call(this)
            : Ext.ux.form.ExtendedLovCombo.superclass.initComponent.call(this)
        ;
    },

    onBeforeQuery: function(qe) {
        var ar = this.getRawValue().trim().split( new RegExp( '\\s*' + RegExp.escape( this.separator ) + '\\s*' ) );
        var token = ar.pop();
        Ext.each( ar, function(e, i, a){ a[i] = '(?=^(?:(?!' + RegExp.escape( e ) + '$).)*$)'; });
        var re = '^(?=^' + RegExp.escape( token ) + ')'; // search the list for entries starting with the entered text
        if ( token.length > 0 ){
            re += ar.join(''); // filter out the items already entered fully
            if ( this.addSelectAllItem ){
                re += '(?=^(?:(?!' + this.selectAllTextField + '$).)*$)'; // disallow the 'Select all' list item
            }
        }
        re += '.*$';
        qe.query = new RegExp( re );
        qe.query.length = token.length;
    },

    onTypeAhead: function(){
        if(this.store.getCount() > 0){
            var r = this.store.getAt(0);
            var newValue = r.data[this.displayField];
            var len = newValue.length;
            var rv = this.getRawValue();
            var token = rv.trim().split( new RegExp( '\\s*' + RegExp.escape( this.separator ) + '\\s*' ) ).pop();
            var selStart = token.length;
            if ( selStart < len && selStart > 0 ){
                var i = rv.lastIndexOf( token );
                if ( i >= 0 ){
                    this.setRawValue( rv.replace( new RegExp( '^(.*)' + RegExp.escape(token) + '(.*)$' ), '$1'+newValue+'$2' ) );
                    this.selectText( i + selStart, i + len );
                }
            }
        }
    },

    assertValue: function() {
        this.list.hide();
        var rva = this.getRawValue().trim().split( new RegExp( '\\s*' + RegExp.escape( this.separator ) + '\\s*' ) );
        var va = [];
        var snapshot = this.store.snapshot || this.store.data;

        // iterate through raw values and records and check/uncheck items
        Ext.each(rva, function(v) {
            snapshot.each(function(r) {
                if(v === r.get(this.displayField)) {
                    va.push(r.get(this.valueField));
                }
            }, this);
        }, this);
        this.setValue(va.join(this.separator));
        this.store.clearFilter();
    },

    // Add the 'Select All' record if appropriate (private)
    initSelectAll: function(){
        if(this.store && this.addSelectAllItem && this.store.getCount() > 0 ){
            var RecordType = Ext.data.Record.create([this.valueField, this.displayField]);
            var data = {};
            data[this.valueField]   = this.selectAllValueField;
            data[this.displayField] = this.selectAllTextField;
            this.store.insert(0, [new RecordType(data)]);
        }
        if(this.allSelected){
            this.selectAll();
        }
    },

    //Select correct action for selected record
    onViewClick: function(doFocus){
        var index = this.view.getSelectedIndexes()[0];
        if (this.addSelectAllItem && index == 0) {
            this.toggleAll();
            if ( this.addSelectAllItem ){
                var r = this.store.getAt(0);
                this.fireEvent('select', this, r, 0);
            }
        }else {
            var r = this.store.getAt(index);
            if(r){
                this.onSelect(r, index);
            }
            if(doFocus !== false){
                this.el.focus();
            }
        }
    },

    //Escape selectAll item value if it's here
    getCheckedArray: function(field) {
        field = field || this.valueField;
        var c = [];

        // store may be filtered so get all records
        var snapshot = this.store.snapshot || this.store.data;

        snapshot.each(function(r, index) {
            if(((this.addSelectAllItem && index > 0) || !this.addSelectAllItem) && r.get(this.checkField)) {
                c.push(r.get(field));
            }
        }, this);

        return c;
    },

    //Using allChecked value
    setValue: function(v) {

        if(v) {
            v = '' + v;
            if(this.valueField && this.store.getCount()) {
                this.store.suspendEvents(true);
                this.store.clearFilter();
                this.allSelected = true;
                this.store.each(function(r, index) {
                    v = '' + v;
                    var checked =
                        !(
                            v.search(
                                '(^|' + this.separator + ')' +
                                RegExp.escape( r.get( this.valueField ) ) +
                                '(' + this.separator + '|$)'
                            ) == -1
                        );

                    r.set(this.checkField, checked);

                    if (this.addSelectAllItem && index > 0) {
                        this.allSelected = this.allSelected && checked;
                    }
                }, this);

                if (this.addSelectAllItem) {
                    this.store.getAt(0).set(this.checkField, this.allSelected);
                }

                this.store.resumeEvents();
                this.value = this.getCheckedValue();
                this.setRawValue(this.getCheckedDisplay());
                if(this.hiddenField) {
                    this.hiddenField.value = this.value;
                }
            }
            else {
                this.value = v;
                this.setRawValue(v);
                if(this.hiddenField) {
                    this.hiddenField.value = v;
                }
            }
            if(this.el) {
                this.el.removeClass(this.emptyClass);
            }
        }
        else {
            this.clearValue();
        }
    },

    //Toggle action for de/selectAll
    toggleAll: function(){
        if(this.allSelected){
            this.allSelected = false;
            this.deselectAll();
        }else{
            this.allSelected = true;
            this.selectAll();
        }
    },

    //Size the drop-down list to the contents
    resizeToFitContent: function(){
        var el = this.getEl();
        if ( el != undefined && this.rendered ){
            if ( ! this.elMetrics ){
                this.elMetrics = Ext.util.TextMetrics.createInstance( el );
            }
            var m = this.elMetrics, width = 0, s = this.getSize();
            if ( this.store ){
                this.store.each(function (r) {
                    var text = r.get(this.displayField);
                    width = Math.max(width, m.getWidth( Ext.util.Format.htmlEncode(text) ));
                }, this);
            }
            width += el.getBorderWidth('lr');
            width += el.getPadding('lr');
            if (this.trigger) {
                width += this.trigger.getWidth();
            }
            s.width = width;
            width += 3 * Ext.getScrollBarWidth() + 60;
            if ( this.pageSize > 0 && this.pageTb ){
                var toolbar = this.pageTb.el;
                width = Math.max(
                    width,
                    toolbar.child('.x-toolbar-left-row').getWidth() +
                    toolbar.child('.x-toolbar-left').getFrameWidth('lr') +
                    toolbar.child('.x-toolbar-right').getFrameWidth('lr') +
                    toolbar.getFrameWidth('lr')
                );
            }
            this.listWidth = width;
            this.minListWidth = width;
            if ( this.list != undefined && this.innerList != undefined ){
                this.list.setSize( width );
                this.innerList.setWidth( width - this.list.getFrameWidth('lr') );
                this.restrictHeight();
            }

            if( this.resizable && this.resizer ){
                this.resizer.minWidth = width;
            }
        }
    },

    initList: function(){
        if(!this.list){
            var cls = 'x-combo-list',
                listParent = Ext.getDom(this.getListParent() || Ext.getBody());

            this.list = new Ext.Layer({
                parentEl: listParent,
                shadow: this.shadow,
                cls: [cls, this.listClass].join(' '),
                constrain:false,
                zindex: this.getZIndex(listParent)
            });

            var lw = this.listWidth || Math.max(this.wrap.getWidth(), this.minListWidth);
            this.list.setSize(lw, 0);
            this.list.swallowEvent('mousewheel');
            this.assetHeight = 0;
            if(this.syncFont !== false){
                this.list.setStyle('font-size', this.el.getStyle('font-size'));
            }
            if(this.title){
                this.header = this.list.createChild({cls:cls+'-hd', html: this.title});
                this.assetHeight += this.header.getHeight();
            }

            this.innerList = this.list.createChild({cls:cls+'-inner'});
            this.mon(this.innerList, 'mouseover', this.onViewOver, this);
            this.mon(this.innerList, 'mousemove', this.onViewMove, this);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));

            if(this.pageSize){
                this.footer = this.list.createChild({cls:cls+'-ft'});
                this.pageTb = new Ext.PagingToolbar({
                    store: this.store,
                    pageSize: this.pageSize,
                    renderTo:this.footer
                });
                this.assetHeight += this.footer.getHeight();
            }

            if(!this.tpl){
                this.tpl = '<tpl for="."><div class="'+cls+'-item">{' + this.displayField + '}</div></tpl>';
            }

            this.view = new Ext.DataView({
                applyTo: this.innerList,
                tpl: this.tpl,
                singleSelect: true,
                selectedClass: this.selectedClass,
                itemSelector: this.itemSelector || '.' + cls + '-item',
                emptyText: this.listEmptyText,
                deferEmptyText: false
            });

            this.mon(this.view, {
                containerclick : this.onViewClick,
                click : this.onViewClick,
                scope :this
            });

            this.bindStore(this.store, true);

            if ( this.pageSize > 0 && this.pageTb ){
                var toolbar = this.pageTb.el;
                var width = Math.max(
                    this.getWidth(),
                    toolbar.child('.x-toolbar-left-row').getWidth() +
                    toolbar.child('.x-toolbar-left').getFrameWidth('lr') +
                    toolbar.child('.x-toolbar-right').getFrameWidth('lr') +
                    toolbar.getFrameWidth('lr')
                );
                this.listWidth = width;
                this.minListWidth = width;
                if ( this.list != undefined && this.innerList != undefined ){
                    this.list.setSize( width );
                    this.innerList.setWidth( width - this.list.getFrameWidth('lr') );
                }
            }

            if(this.resizable){
                this.resizer = new Ext.Resizable(this.list,  {
                    pinned:true, handles:'se', minWidth: this.minListWidth
                });
                this.mon(this.resizer, 'resize', function(r, w, h){
                    this.maxHeight = h-this.handleHeight-this.list.getFrameWidth('tb')-this.assetHeight;
                    this.listWidth = w;
                    this.innerList.setWidth(w - this.list.getFrameWidth('lr'));
                    this.restrictHeight();
                }, this);

                this[this.pageSize?'footer':'innerList'].setStyle('margin-bottom', this.handleHeight+'px');
            }
        }
    },

    onTrigger1Click: Ext.form.ComboBox.prototype.onTriggerClick,
    onTrigger2Click: function()
    {
        if ( ! this.disabled ){
            this.collapse();
            this.allSelected = false;
            if ( this.store ){
                this.reset();                       // reset contents of combobox, clear any filters as well
            }
            this.clearValue();
            this.fireEvent('cleared');          // send notification that contents have been cleared
        }
    },

    trigger1Class: Ext.form.ComboBox.prototype.triggerClass,
    trigger2Class: 'x-form-clear-trigger',

    getTrigger: function(){
        this.addClearItem ? Ext.form.TwinTriggerField.prototype.getTrigger.call(this) : Ext.form.ComboBox.prototype.getTrigger.call(this);
    },
    initTrigger: function(){
        this.addClearItem ? Ext.form.TwinTriggerField.prototype.initTrigger.call(this) : Ext.form.ComboBox.prototype.initTrigger.call(this);
    },

    getCheckedArrayInds: function() {
        var c = [];

        // store may be filtered so get all records
        var snapshot = this.store.snapshot || this.store.data;

        snapshot.each(function(r) {
            if(((this.addSelectAllItem && index > 0) || !this.addSelectAllItem) && r.get(this.checkField)) {
                c.push(this.store.indexOf(r));
            }
        }, this);

        return c;
    },

    /////////////////////////////
    //      Custom configs     //
    /////////////////////////////
    autoSelect: false,
    emptyText: 'Select...',
    forceSelection: true,
    minChars: 0,
    mode: 'local',
    resizable: true,
    triggerAction: 'all',
    typeAhead: true
    /////////////////////////////

});
Ext.reg('extended-lov-combo', Ext.ux.form.ExtendedLovCombo);
