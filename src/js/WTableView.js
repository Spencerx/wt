/*
 * Copyright (C) 2010 Emweb bvba, Kessel-Lo, Belgium.
 *
 * See the LICENSE file for terms of use.
 */

/* Note: this is at the same time valid JavaScript and C++. */

WT_DECLARE_WT_MEMBER
(1, JavaScriptConstructor, "WTableView",
 function(APP, el, contentsContainer, headerContainer, headerColumnsContainer) {
   jQuery.data(el, 'obj', this);

   var self = this;
   var WT = APP.WT;

   /** @const */ var EnsureVisible = 0;
   /** @const */ var PositionAtTop = 1;
   /** @const */ var PositionAtBottom = 2;
   /** @const */ var PositionAtCenter = 3;

   var scrollX1 = 0, scrollX2 = 0, scrollY1 = 0, scrollY2 = 0;

   /*
    * We need to remember this for when going through a hide()
    * show() cycle.
    */
   var scrollTop = 0, scrollLeft = 0;

   contentsContainer.onscroll = function() {
     scrollLeft = headerContainer.scrollLeft
		   = contentsContainer.scrollLeft;
     scrollTop = headerColumnsContainer.scrollTop
		    = contentsContainer.scrollTop;

     if (contentsContainer.scrollTop == 0 && WT.isAndroid)
       return;

     if (contentsContainer.clientWidth && contentsContainer.clientHeight
         && (contentsContainer.scrollTop < scrollY1
	 || contentsContainer.scrollTop > scrollY2
	 || contentsContainer.scrollLeft < scrollX1
	 || contentsContainer.scrollLeft > scrollX2))
       APP.emit(el, 'scrolled', contentsContainer.scrollLeft,
	        contentsContainer.scrollTop, contentsContainer.clientWidth,
	        contentsContainer.clientHeight);
   };

   function getItem(event) {
     var columnId = -1, rowIdx = -1, selected = false,
         drop = false, ele = null;

     var t = WT.target(event);

     while (t) {
       var $t = $(t);
       if ($t.hasClass('Wt-tv-contents')) {
	 break;
       } else if ($t.hasClass('Wt-tv-c')) {
	 if (t.getAttribute('drop') === 'true')
	   drop = true;
	 if ($t.hasClass('Wt-selected'))
	   selected = true;
	 ele = t;
	 t = t.parentNode;
	 columnId = t.className.split(' ')[0].substring(7) * 1;
	 break;
       }
       t = t.parentNode;
     }

     return { columnId: columnId, rowIdx: rowIdx, selected: selected,
	      drop: drop, el: ele };
   };

   function rowHeight() {
     return WT.pxself(contentsContainer.firstChild, "lineHeight");
   }

   function indexOf(child) {
     var i, il, plist = child.parentNode.childNodes;

     for (i = 0, il = plist.length; i < il; ++i)
       if (plist[i] == child)
	 return i;

     return -1;
   }

   function resizeColumn(header, delta) {
     var rtl = $(document.body).hasClass('Wt-rtl');

     if (rtl)
       delta = -delta;

     var columnClass = header.className.split(' ')[0],
         columnId = columnClass.substring(7) * 1,
	 headers = header.parentNode,
	 headerColumn = headers.parentNode !== headerContainer,
	 contents = headerColumn
		      ? headerColumnsContainer.firstChild
		      : contentsContainer.firstChild,
	 wt_tv_contents = contents.firstChild,
	 column = $(contents).find('.' + columnClass).get(0),
	 h = header.nextSibling, c = column.nextSibling,
         newWidth = WT.pxself(header, 'width') - 1 + delta;

     var cwidth = (WT.pxself(headers, 'width') + delta) + 'px';

     headers.style.width
       = contents.style.width
       = wt_tv_contents.style.width
       = cwidth;

     if (headerColumn)
       headerColumnsContainer.style.width = cwidth;

     header.style.width = (newWidth + 1) + 'px';
     column.style.width = (newWidth + 7) + 'px';

     for (; h; h = h.nextSibling) {
       if (c) {
	 if (!rtl)
	   c.style.left = (WT.pxself(c, 'left') + delta) + 'px';
	 else
	   c.style.right = (WT.pxself(c, 'right') + delta) + 'px';
	 c = c.nextSibling;
       }
     }

     APP.emit(el, 'columnResized', columnId, parseInt(newWidth));
     self.autoJavaScript();
   }

   this.mouseDown = function(obj, event) {
     WT.capture(null);

     var item = getItem(event);
     if (el.getAttribute('drag') === 'true' && item.selected)
       APP._p_.dragStart(el, event);
   };

   this.resizeHandleMDown = function(obj, event) {
     var header = obj.parentNode,
         cw = WT.pxself(header, 'width') - 1,
         minDelta = -cw,
         maxDelta = 10000;

     var rtl = $(document.body).hasClass('Wt-rtl');
     if (rtl) {
       var tmp = minDelta;
       minDelta = -maxDelta;
       maxDelta = -tmp;
     }

     new WT.SizeHandle(WT, 'h', obj.offsetWidth, el.offsetHeight,
		       minDelta, maxDelta, 'Wt-hsh',
		       function (delta) {
			 resizeColumn(header, delta);
		       }, obj, el, event, -2, -1);
   };

   this.scrolled = function(X1, X2, Y1, Y2) {
     scrollX1 = X1;
     scrollX2 = X2;
     scrollY1 = Y1;
     scrollY2 = Y2;
   };

   this.resetScroll = function() {
     headerContainer.scrollLeft = scrollLeft;
     contentsContainer.scrollLeft = scrollLeft;
     contentsContainer.scrollTop = scrollTop;
     headerColumnsContainer.scrollTop = scrollTop;
   };

   this.scrollTo = function(x, y, hint) {
     if (y != -1) {
       var top = contentsContainer.scrollTop,
	   height = contentsContainer.clientHeight;
       if (hint == EnsureVisible) {
	 if (top + height < y)
	   hint = PositionAtTop;
	 else if (y < top)
	   hint = PositionAtBottom;
       }

       switch (hint) {
       case PositionAtTop:
         contentsContainer.scrollTop = y; break;
       case PositionAtBottom:
         contentsContainer.scrollTop = y - (height - rowHeight()); break;
       case PositionAtCenter:
         contentsContainer.scrollTop = y - (height - rowHeight())/2; break;
       }

       contentsContainer.onscroll();
     }
   };

   var dropEl = null;

   el.handleDragDrop=function(action, object, event, sourceId, mimeType) {
     if (dropEl) {
       dropEl.className = dropEl.classNameOrig;
       dropEl = null;
     }

     if (action == 'end')
       return;

     var item = getItem(event);

     if (!item.selected && item.drop) {
       if (action == 'drop') {
	 APP.emit(el, { name: 'dropEvent', eventObject: object, event: event },
		  item.rowIdx, item.columnId, sourceId, mimeType);
       } else {
         object.className = 'Wt-valid-drop';
         dropEl = item.el;
         dropEl.classNameOrig = dropEl.className;
         dropEl.className = dropEl.className + ' Wt-drop-site';
       }
     } else {
       object.className = '';
     }
   };

   /* Handle TAB/SHIFT-TAB for cycling through editors in the right order */
   el.onkeydown=function(e) {
     var event = e||window.event;

     var leftKey = 37,
       upKey = 38,
       rightKey = 39,
       downKey = 40;

     if (event.keyCode == 9) {
       WT.cancelEvent(event);

       /* Find next/prev input element, first by row, then by column */
       var item = getItem(event);
       if (!item.el)
	 return;

       var col = item.el.parentNode,
           rowi = indexOf(item.el),
           coli = indexOf(col),
           cols = col.parentNode.childNodes.length,
           rows = col.childNodes.length,
	   back = event.shiftKey,
	   wrapped = false;

       var i = rowi, j;

       for (;;) {
	 for (;
	      back ? i >= 0 : i < rows;
	      i = (back ? i-1 : i+1)) {
	   if (i == rowi && !wrapped)
	     j = back ? coli - 1 : coli + 1;
	   else
	     j = back ? cols - 1 : 0;
	   for (;
		back ? j >= 0 : j < cols;
		j = (back ? j-1 : j+1)) {
	     /* We have wrapped and arrived back at the beginning */
	     if (i == rowi && j == coli)
	       return;
	     col = col.parentNode.childNodes[j];
	     var elij = col.childNodes[i];
	     var inputs = $(elij).find(":input");
	     if (inputs.size() > 0) {
	       setTimeout(function() { inputs.focus(); }, 0);
	       return;
	     }
	   }
	 }
	 i = back ? rows - 1 : 0;
	 wrapped = true;
       }
     }
     /* If keycode is up/down/right/left */
     else if (event.keyCode >= leftKey && event.keyCode <= downKey) {
       var currentEl = WT.target(event);

       //do not allow arrow navigation from select
       if (currentEl.nodeName == 'select')
	 return;

       var item = getItem(event);
       if (!item.el)
	 return;

       var col = item.el.parentNode,
           rowi = indexOf(item.el),
           coli = indexOf(col),
           cols = col.parentNode.childNodes.length,
	   rows = col.childNodes.length;

       switch (event.keyCode) {
	 case rightKey:
	 if (WT.hasTag(currentEl,'INPUT')
	       && currentEl.type == 'text') {
	     var range = WT.getSelectionRange(currentEl);
	     if (range.start != currentEl.value.length)
	       return;
	   }
	   coli++; break;
	 case upKey:
	   rowi--; break;
	 case leftKey:
	   if (WT.hasTag(currentEl,'INPUT')
	       && currentEl.type == 'text') {
	     var range = WT.getSelectionRange(currentEl);
	     if (range.start != 0)
	       return;
	   }
	   coli--; break;
	 case downKey:
	   rowi++; break;
	 default:
	   return;
       }

       WT.cancelEvent(event);

       if (rowi > -1 && rowi < rows && coli > -1 && coli < cols) {
	 col = col.parentNode.childNodes[coli];
	 var elToSelect = col.childNodes[rowi];
	 var inputs = $(elToSelect).find(":input");
	 if (inputs.size() > 0) {
	   setTimeout(function() { inputs.focus(); }, 0);
	   return;
	 }
       }
     }
   };

   this.autoJavaScript = function() {
     if (el.parentNode == null) {
       el = contentsContainer = headerContainer = null;
       this.autoJavaScript = function() { };
       return;
     }

     if (WT.isHidden(el))
       return;

     if (!WT.isIE && (scrollTop != contentsContainer.scrollTop
         || scrollLeft != contentsContainer.scrollLeft)) {
       headerContainer.scrollLeft = contentsContainer.scrollLeft
				      = scrollLeft;
       headerColumnsContainer.scrollTop = contentsContainer.scrollTop
					    = scrollTop;
     }

     var tw = el.offsetWidth - WT.px(el, 'borderLeftWidth')
	      - WT.px(el, 'borderRightWidth');

     var scrollwidth = contentsContainer.offsetWidth
       - contentsContainer.clientWidth;
     tw -= scrollwidth;
     tw -= headerColumnsContainer.clientWidth;

     if (tw > 200  // XXX: IE's incremental rendering foobars completely
         && (tw != contentsContainer.tw)) {
       contentsContainer.tw = tw;

       contentsContainer.style.width = (tw + scrollwidth) + 'px';
       headerContainer.style.width = tw + 'px';

       // IE moves the scrollbar left in rtl mode.
       if (!WT.isIE)
	 headerContainer.style.marginRight = scrollwidth + 'px';
     }

     var scrollheight = contentsContainer.offsetHeight
       - contentsContainer.clientHeight;

     if (headerColumnsContainer.parentNode) {
       var pns = headerColumnsContainer.parentNode.style;
       if (pns && (pns.paddingBottom !== scrollheight + 'px')) {
	 pns.paddingBottom = scrollheight + 'px';
	 if (APP.layouts) {
	   APP.layouts.adjust(el.children[0].id);
	   APP.layouts.adjust();
	 }
       }
     }
   };
 });
