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

function removeById(elId) {
    $( '#' + elId ).remove();
};

function removeByClass(className) {
    $( '.' + className ).remove();
};

function captureEvents(observable) {
    Ext.util.Observable.capture(
        observable,
        function(eventName) {
            console.info(eventName);
        },
        this
    );
};

function onFailure(errorInfo, options, responseObj){
    var strngErrorContact = ' Please, contact ldashevs@fhcrc.org, if you have questions.';

    if (errorInfo && errorInfo.exception)
        Ext.Msg.alert('Error', 'Failure: ' + errorInfo.exception + strngErrorContact);
    else {
        if ( responseObj != undefined ){
            Ext.Msg.alert('Error', 'Failure: ' + responseObj.statusText + strngErrorContact);
        } else {
            Ext.Msg.alert('Error', 'Failure: ' + errorInfo.statusText + (errorInfo.timedout==true?', timed out.':'') + strngErrorContact);
        }
    }
};

Ext4.Ajax.timeout = 60 * 60 * 1000; // override the timeout to be 60 mintues; value is in milliseconds

Ext.QuickTips.init();

// IE 7 compatibility
Object.keys = Object.keys || (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !{toString:null}.propertyIsEnumerable("toString"),
            DontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            DontEnumsLength = DontEnums.length;

    return function (o) {
        if (typeof o != "object" && typeof o != "function" || o === null)
            throw new TypeError("Object.keys called on a non-object");

        var result = [];
        for (var name in o) {
            if (hasOwnProperty.call(o, name))
                result.push(name);
        }

        if (hasDontEnumBug) {
            for (var i = 0; i < DontEnumsLength; i++) {
                if (hasOwnProperty.call(o, DontEnums[i]))
                    result.push(DontEnums[i]);
            }
        }

        return result;
    };
})();

// Search in the middle of words / case insensitive
Ext.override (Ext.ux.form.SuperBoxSelect, {
    anyMatch: true,
    caseSensitive: false,

    //override doQuery function
    doQuery : function(q, forceAll){

        if(q === undefined || q === null){
            q = '';
        }

        var qe = {
            query: q,
            forceAll: forceAll,
            combo: this,
            cancel:false
        };

        if(this.fireEvent('beforequery', qe)===false || qe.cancel){
            return false;
        }

        q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
                this.lastQuery = q;
                if(this.mode == 'local'){
                    this.selectedIndex = -1;
                    if(forceAll){
                        this.store.clearFilter();
                    }else{
                        this.store.filter(this.displayField, q, this.anyMatch, this.caseSensitive);
                    }
                    this.onLoad();
                }else{
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }
    },
    onTypeAhead: function() {
        var nodes = this.view.getNodes();
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var d = this.view.getRecord(n).data;
            var re = new RegExp('(.*?)(' + '' + Ext.escapeRe(this.getRawValue()) + ')(.*)', this.caseSensitive ? '' : 'i');
            var h = d[this.displayField];

            h=h.replace(re, '$1<span class="mark-combo-match">$2</span>$3');
            n.innerHTML=h;
        }
    }
});


/*
 * Override to set Tab titles centered (can do any other customizations here)
 */
Ext.TabPanel.override({

    tabStripInnerStyle : 'text-align: center;',

    onRender : function(ct, position){
        Ext.TabPanel.superclass.onRender.call(this, ct, position);

        if(this.plain){
            var pos = this.tabPosition == 'top' ? 'header' : 'footer';
            this[pos].addClass('x-tab-panel-'+pos+'-plain');
        }

        var st = this[this.stripTarget];

        this.stripWrap = st.createChild({cls:'x-tab-strip-wrap', cn:{
            tag:'ul', cls:'x-tab-strip x-tab-strip-'+this.tabPosition}});

        var beforeEl = (this.tabPosition=='bottom' ? this.stripWrap : null);
        st.createChild({cls:'x-tab-strip-spacer'}, beforeEl);
        this.strip = new Ext.Element(this.stripWrap.dom.firstChild);


        this.edge = this.strip.createChild({tag:'li', cls:'x-tab-edge', cn: [{tag: 'span', cls: 'x-tab-strip-text', cn: '&#160;'}]});
        this.strip.createChild({cls:'x-clear'});

        this.body.addClass('x-tab-panel-body-'+this.tabPosition);


        if(!this.itemTpl){
            var tt = new Ext.Template(
                    '<li class="{cls}" id="{id}"><a class="x-tab-strip-close"></a>',
                    '<a class="x-tab-right" href="#"><em class="x-tab-left">',
                    '<span style="{tabStripInnerStyle}" class="x-tab-strip-inner"><span class="x-tab-strip-text {iconCls}">{text}</span></span>',
                    '</em></a></li>'
            );
            tt.disableFormats = true;
            tt.compile();
            Ext.TabPanel.prototype.itemTpl = tt;
        }

        this.items.each(this.initTab, this);
    },

    initTab : function(item, index){
        var before = this.strip.dom.childNodes[index],
                p = this.getTemplateArgs(item);
        p.tabStripInnerStyle = this.tabStripInnerStyle;
        var     el = before ?
                        this.itemTpl.insertBefore(before, p) :
                        this.itemTpl.append(this.strip, p),
                cls = 'x-tab-strip-over',
                tabEl = Ext.get(el);

        tabEl.hover(function(){
            if(!item.disabled){
                tabEl.addClass(cls);
            }
        }, function(){
            tabEl.removeClass(cls);
        });

        if(item.tabTip){
            tabEl.child('span.x-tab-strip-text', true).qtip = item.tabTip;
        }
        item.tabEl = el;


        tabEl.select('a').on('click', function(e){
            if(!e.getPageX()){
                this.onStripMouseDown(e);
            }
        }, this, {preventDefault: true});

        item.on({
            scope: this,
            disable: this.onItemDisabled,
            enable: this.onItemEnabled,
            titlechange: this.onItemTitleChanged,
            iconchange: this.onItemIconChanged,
            beforeshow: this.onBeforeShowItem
        });
    }

});

// Remove elements from an array by values
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

// IE8 and below
if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(what, i) {
        i = i || 0;
        var L = this.length;
        while (i < L) {
            if(this[i] === what) return i;
            ++i;
        }
        return -1;
    };
}


// ? First column non-moveable
Ext.override(Ext.grid.HeaderDragZone, {
    getDragData: function (e) {
        var t = Ext.lib.Event.getTarget(e);
        var h = this.view.findHeaderCell(t);
        if (h && (this.grid.colModel.config[this.view.getCellIndex(h)].dragable !== false)) {
            return {
                ddel: h.firstChild,
                header: h
            };
        }
        return false;
    }
});
// ? //
Ext.CustomColumnModel = Ext.extend(Ext.grid.ColumnModel, {
    moveColumn: function (oldIndex, newIndex) {
        if (oldIndex == 0 || newIndex == 0) {
            // Do nothing.
        }
        else {
            var c = this.config[oldIndex];
            this.config.splice(oldIndex, 1);
            this.config.splice(newIndex, 0, c);
            this.dataMap = null;
            this.fireEvent("columnmoved", this, oldIndex, newIndex);
        }
    }
});

// Empty item in a ComboBox should now appear full heigh with this fix
/*Ext.override (Ext.form.ComboBox, {
 initList : (function() {
 if (!this.tpl) {
 this.tpl = new Ext.XTemplate(
 '<tpl for="."><div>{',
 this.displayField,
 ':this.blank}</div></tpl>',
 {
 blank : function(value) {
 return value === '' ? '&nbsp'
 : value;
 }
 });
 }
 }).createSequence(Ext.form.ComboBox.prototype.initList)
 });*/
