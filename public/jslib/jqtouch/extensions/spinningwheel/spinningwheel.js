/**
 * Copyright (c) 2009 Matteo Spinelli, http://cubiq.org/
 * Copyright (c) 2011 BeeDesk, Inc.
 *
 * Matteo:
 * Find more about the Spinning Wheel function at
 * http://cubiq.org/spinning-wheel-on-webkit-for-iphone-ipod-touch/11
 *
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 * 
 * BeeDesk:
 * - Added:
 * -   1) Made it a non-singleton
 * -   2) Added desktop support
 * - Broke:
 * -   1) No longer inserts required element 
 * -   2) Does not have Okay, Cancel button (should put back as an option)
 */
$(document).ready(function() {
  $("#jqt .datewheelpane").bind("pagein", function(event, info) {
    var defaultAllday = false;
    var target = this, $target = $(this);
    var dateobject;

    var search = info.search;
    if (!!search.starts) {
      selected = null;
      dateobject = DateFormats.getDateObject(search.starts, search.ends, search.format);
    } else {
      dateobject = DateFormats.convertDateToObject(new Date(), !defaultAllday);
      dateobject.hours++;
      dateobject.minutes = 30;
      dateobject.duration = 60;
    }

    var wheel = $target.data("spinningwheel"); 
    if (!wheel) {
      wheel = new DateTimeSpinningWheel(target, {
        onValueUpdated: function(dateobject) {
          var values = DateFormats.getStartEndFormat(dateobject);

          var $field = $target.find("input[name='starts']");
          $field.val(values.startdate);

          var $endfield = $target.find("input[name='ends']");
          $endfield.val(values.enddate);

          if (dateobject.duration < 0) {
            $field.addClass("invalid");
            $endfield.addClass("invalid");
          } else {
            $field.removeClass("invalid");
            $endfield.removeClass("invalid");
          }

          var $formatfield = $target.find("input[name='format']");
          $formatfield.val(values.format);
        }
      }, dateobject);
      $target.data("spinningwheel", wheel);
    } else {
      wheel.reset(dateobject);
    }
    $target.find(".sw-allday").attr("checked", !!dateobject.hours);      
    $target.find("input[name='starts']").click();
  });
  $("#jqt .datewheelpane .sw-allday").bind("change", function() {
    var $target = $(this);
    var checked = $target.attr("checked");
    $target.parents(".datewheelpane").data("spinningwheel").setAlldayMode(!checked);
  });
  $("#jqt .datewheelpane .sw-starts").bind("click", function() {
    var $target = $(this);
    $target.siblings().removeClass("selected");
    $target.addClass("selected");
    $target.parents(".datewheelpane").data("spinningwheel").setDurationMode(false);
  });
  $("#jqt .datewheelpane .sw-ends").bind("click", function() {
    var $target = $(this);
    $target.siblings().removeClass("selected");
    $target.addClass("selected");
    $target.parents(".datewheelpane").data("spinningwheel").setDurationMode(true);
  });
  $("#jqt .datewheelpane").bind('pageAnimationEnd', function(event, info) {
    if (info.direction == 'in') {
      $("#sw-slots-wrapper").addClass("show");
    }
  });
  $("#jqt .datewheelpane").bind('pageAnimationEnd', function(event, info) {
    if (info.direction == 'out') {
      $("#sw-slots-wrapper").removeClass("show");
    }
  });
});

function DateTimeSpinningWheel(container, clientcallbacks, dateobject) {
  var instance = this;
  var strategy = null;
  var slots;
  var wheeladjuster;
  var allday;
  var duration = false;
  var selected;

  /* const */
  var wkdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var mos = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var monthlabels = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'Octobar', 'November', 'December'];

  function setSlots() {
    var newslots = [];
    var newslotshandler = [];
    var newwheeladjuster;

    var i, len;
    var days = [], years = [], months = [];
    var nowday = DateFormats.convertDateToObject(new Date(), true);
    
    if (allday) {
      for(i = 1; i <= 31; i ++) {
        days.push({value: i, label: i+''});
      }
      var dayslot = {values: days, defaultValue: selected.date, highlightValue: nowday.date, style: 'right'};

      for(i = nowday.year-20; i < nowday.year+79; i++) {
        years.push({value: i, label: i+''});
      }
      var yearslot = {values: years, defaultValue: selected.year, highlightValue: nowday.year, style: ''};

      for(i = 0, len = monthlabels.length; i < len; i++) {
        months.push({value: i, label: monthlabels[i]});
      }
      var monthslot = {values: months, defaultValue: selected.month, highlightValue: nowday.month, style: 'right'};

      var order = DateFormats.getLocaleDateOrder();
      newslots[order.indexOf('M')] = monthslot;
      newslotshandler[order.indexOf('M')] = {
        set: function(date, value) {
          date.month = value;
        },
        get: function(date) {
          return date.month;
        }
      };
      newslots[order.indexOf('D')] = dayslot;
      newslotshandler[order.indexOf('D')] = {
        set: function(date, value) {
          date.date = value;
        },
        get: function(date) {
          return date.date;
        }
      };
      newslots[order.indexOf('Y')] = yearslot;
      newslotshandler[order.indexOf('Y')] = {
        set: function(date, value) {
          date.year = value;
        },
        get: function(date) {
          return date.year;
        }
      };

      newwheeladjuster = function(date) {
        var adjusted = false;
        var maxday = DateFormats.getMonthDays(date.year, date.month);
        if (maxday >= 29) {
          strategy.enableValue(1, 29);
        } else {
          strategy.disableValue(1, 29);
        }
        if (maxday >= 30) {
          strategy.enableValue(1, 30);
        } else {
          strategy.disableValue(1, 30);
        }
        if (maxday >= 31) {
          strategy.enableValue(1, 31);
        } else {
          strategy.disableValue(1, 31);
        }
        if (date.date > maxday) {
          adjusted =true;
        }
        return adjusted;
      };
    } else {
      var days = [], today, selectedday;
      var now = new Date();
      var middledate = new Date(selected.year, selected.month, selected.date);
      for(var i = -60; i <= 180; i++) {
        var date = DateFormats.getOffsetDay(middledate, i);
        var value = (date.getFullYear() * 100000) + (date.getMonth() * 100) + date.getDate(); 
        if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
          days.push({value: value, label: "Today"});
          today = value;
        } else {
          days.push({value: value, label: '<span class="sw-day">' + wkdays[date.getDay()] + '</span> ' + mos[date.getMonth()] + ' ' + date.getDate()});
        }
      }
      selectedday = (selected.year * 100000) + (selected.month * 100) + selected.date;
      var dayslot = {values: days, defaultValue: selectedday, highlightValue: today, style: 'right'};
      newslots.push(dayslot);
      newslotshandler.push({
        set: function(date, value) {
          var year = Math.floor(value / 100000);
          var month = Math.floor((value % 100000) / 100);
          var day = value % 100;
          date.date = day;
          date.month = month;
          date.year = year;
        },
        get: function(date) {
          var readabledate = (date.year * 100000) + (date.month * 100) + date.date;
          return readabledate;
        }
      });

      var timeformat = DateFormats.getLocaleTimeFormat();      
      var twentyfour = /HH/.test(timeformat);
      
      // @TODO -- workaround: http://code.google.com/p/chromium/issues/detail?id=3607
      twentyfour = false;

      if (selected.hours === undefined || selected.hours === null) {
        selected.hours = now.getHours();
        selected.minutes = 0;
      }
      var hours = [], defaultHours;
      if (twentyfour) {
        for(var i = 0; i <= 23; i++) {
          hours.push({label: (i!==0? i: 12)+'', value: i});
        }
        defaultHours = selected.hours; 
      } else {
        for(var i = 0; i < 12; i++) {
          hours.push({label: (i!==0? i: 12)+'', value: i});
        }
        defaultHours = selected.hours % 12;
      }
      newslots.push({values: hours, defaultValue: defaultHours, style: 'right'});
      newslotshandler.push({
        set: function(date, value) {
          date.hours = value;
        },
        get: function(date) {
          return twentyfour? date.hours : date.hours % 12;
        }
      });

      var mins = [];
      for(var i = 0; i < 60; i += 5) {
        var label = (i<10? '0': '') + i;  
        mins.push({value: i, label: label});
      }
      newslots.push({values: mins, defaultValue: selected.minutes, style: ''});
      newslotshandler.push({
        set: function(date, value) {
          date.minutes = value;
        },
        get: function(date) {
          return date.minutes;
        }
      });

      if (!twentyfour) {
        var ampm = [{value: 0, label:'AM'}, {value: 1, label: 'PM'}];
        var defaultampm = selected.hours < 12? 0: 1;
        newslots.push({values: ampm, defaultValue: defaultampm, style: 'right'});
        newslotshandler.push({
          set: function(date, value) {
            if (value === 1) {
              date.hours += 12;
            }
          },
          get: function(date) {
            return date.hours < 12? 0: 1; 
          }
        });
      }

      newwheeladjuster = function(date) {};
    }
    slots = newslots;
    slotshandler = newslotshandler;
    wheeladjuster = newwheeladjuster;
  }

  var callback = {
    onValueUpdated: function(keyvalues) {
      var parts;
      if (!duration) {
        parts = {year: null, month: null, date: null, hours: null, minutes: null, duration: null};
        for (var i=0, len=Math.min(slotshandler.length, keyvalues.values.length); i < len; i++) {
          var value = keyvalues.values[i];
          slotshandler[i].set(parts, value);
          slotshandler[i].set(selected, value);
        }
        parts.duration = selected.duration;
      } else {
        var endjso = {};
        for (var i=0, len=Math.min(slotshandler.length, keyvalues.values.length); i < len; i++) {
          var value = keyvalues.values[i];
          slotshandler[i].set(endjso, value);
        }
        var starts = DateFormats.convertObjectToDate(selected, !allday);
        var ends = DateFormats.convertObjectToDate(endjso, !allday);
        var dura = Math.floor((ends.getTime() - starts.getTime()) / (60 * 1000));
        selected.duration = dura;
        parts = DateFormats.cloneDateObject(selected, !allday, true);
      }
      if (!wheeladjuster(parts)) {
        clientcallbacks.onValueUpdated(parts);
      }
    }
  };

  instance.setAlldayMode = function(newallday) {
    if (allday !== newallday) {
      instance.reset(selected, newallday);
    }
  };
  
  instance.setDurationMode = function(durationmode) {
    if (duration !== durationmode) {
      duration = durationmode;
      instance.position();
    }
  };

  instance.position = function() {
    if (duration !== true && duration !== "true") {
      for (var i=0, len=slotshandler.length; i < len; i++) {
        var value = slotshandler[i].get(selected);
        strategy.scrollToValue(i, value, '500ms');
      }
    } else {
      var enddate = DateFormats.convertObjectToDate(selected, !allday);
      enddate = DateFormats.getOffsetMinute(enddate, selected.duration);
      var jso = DateFormats.convertDateToObject(enddate, !allday);
      for (var i=0, len=slotshandler.length; i < len; i++) {
        var value = slotshandler[i].get(jso);
        strategy.scrollToValue(i, value, '500ms');
      }
    }
  };

  instance.reset = function(setdate, setallday) {
    if (!setdate) {
      console.error("Expect reset date.");
      return;
    }

    selected = null;
    allday = null; 
    if (!selected) {
      selected = setdate;
      allday = null;
    }
    if (setallday !== undefined && setallday !== null) {
      allday = setallday;
    } else {
      allday = !selected.hours;
    }
    if (!!strategy) {
      strategy.destroy();
      strategy = null;
    }
    setSlots();
    strategy = new SpinningWheel(container, slots, callback);
    
    var date = DateFormats.cloneDateObject(selected, !allday, true);
    clientcallbacks.onValueUpdated(date);
  };

  instance.reset(dateobject);
  return instance;
}

function SpinningWheel(container, slots, callbacks) {
var 
  isTouch = ('ontouchstart' in window),
  // Event sniffing
  START_EVENT = isTouch ? 'touchstart' : 'mousedown',
  MOVE_EVENT = isTouch ? 'touchmove': 'mousemove',
  END_EVENT = isTouch ? 'touchend' : 'mouseup',
  CANCEL_EVENT = isTouch ? 'touchcancel' : 'mouseup';

function hasClass(el, className) {
  return new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className);
};

// Add one or more classes to all elements
function addClass(el, className) {
  var updated = false;
  var className = Array.prototype.slice.call(arguments).splice(1);
  for (var i=0, l=className.length; i<l; i++) {
    if (!hasClass(el, className[i])) {
      updated = true;
      el.className = el.className ? el.className + ' ' + className[i] : className[i];
    }
  }
  return updated;
};

// Remove one or more classes from all elements
function removeClass(el, className) {
  var updated = false;
  var className = Array.prototype.slice.call(arguments).splice(1);
  
  for (var i=0, l=className.length; i<l; i++) {
    if (hasClass(el, className)) {
      updated = true;
      el.className = el.className.replace(new RegExp('(^|\\s+)' + className[i] + '(\\s+|$)'), ' ');
    }
  }
  return updated;
};

// http://www.quirksmode.org/js/findpos.html
function findPos(obj) {
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    do {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    } while (obj = obj.offsetParent);
    return {left: curleft, top: curtop};
  }
}

var instance = {
	cellHeight: 44,
	friction: 0.003,
	slotData: [],
	callbacks: null,

	/**
	 * Event handler
	 */
	handleEvent: function (e) {
		if (e.type == START_EVENT) {
			instance.lockScreen(e);
			instance.scrollStart(e);
		} else if (e.type == MOVE_EVENT) {
			instance.lockScreen(e);			
			instance.scrollMove(e);
		} else if (e.type == END_EVENT || e.type == CANCEL_EVENT) {
			instance.scrollEnd(e);
		} else if (e.type == 'webkitTransitionEnd') {
			if (e.target === instance.swWrapper) {
				//instance.destroy();
			} else {
				instance.backWithinBoundaries(e);
			}
		} else if (e.type == 'orientationchange') {
			instance.onOrientationChange(e);
		} else if (e.type == 'scroll') {
			instance.onScroll(e);
		}
	},

	/**
	 *
	 * Global events
	 *
	 */
	onOrientationChange: function (e) {
		window.scrollTo(0, 0);
		instance.swWrapper.style.top = window.innerHeight + window.pageYOffset + 'px';
		instance.calculateSlotsWidth();
	},

	onScroll: function (e) {
		instance.swWrapper.style.top = window.innerHeight + window.pageYOffset + 'px';
	},

	lockScreen: function (e) {
		e.preventDefault();
		e.stopPropagation();
	},

	/**
	 *
	 * Initialization
	 *
	 */
	reset: function () {
		instance.slotEl = [];

		instance.activeSlot = 0;
		
		instance.swWrapper = undefined;
		instance.swSlotWrapper = undefined;
		instance.swSlots = undefined;
		instance.swFrame = undefined;
	},

	calculateSlotsWidth: function () {
		var div = instance.swSlots.getElementsByTagName('div');
		for (var i = 0; i < div.length; i += 1) {
			instance.slotEl[i].slotWidth = div[i].offsetWidth;
		}
	},

	create: function () {
		var i, l, m, mlen, out, ul, div;

		instance.reset();	// Initialize object variables

		/*
  		// Create the Spinning Wheel main wrapper
  		div = document.createElement('div');
  		div.id = 'sw-wrapper';
  		//div.style.top = window.innerHeight + window.pageYOffset + 'px';		// Place the SW down the actual viewing screen
  		//div.style.bottom = 0 + 'px';
  		div.style.webkitTransitionProperty = '-webkit-transform';
  		div.style.display = 'block';
  		div.className += ' current';
  		//div.innerHTML = '<div id="sw-header"><div id="sw-cancel">Cancel</' + 'div><div id="sw-done">Done</' + 'div></' + 'div><div id="sw-slots-wrapper"><div id="sw-slots"></' + 'div></' + 'div><div id="sw-frame"></' + 'div>';
  		div.innerHTML = '<div id="sw-header"><div id="sw-cancel">Cancel</' + 'div><div id="sw-done">Done</' + 'div></' + 'div><div id="sw-slots-wrapper"><div id="sw-frame"></' + 'div><div id="sw-slots"></' + 'div></' + 'div>';
  		//div.innerHTML = '<div id="sw-slots-wrapper"><div id="sw-slots"></' + 'div></' + 'div><div id="sw-frame"></' + 'div>';
      document.body.appendChild(div);
    */
		instance.swWrapper = container;  // The SW wrapper
		instance.swSlotWrapper = container.getElementsByClassName('sw-slots-wrapper')[0];		// Slots visible area
		instance.swSlots = instance.swSlotWrapper.getElementsByClassName('sw-slots')[0];						// Pseudo table element (inner wrapper)
		instance.swFrame = instance.swSlotWrapper.getElementsByClassName('sw-frame')[0];						// The scrolling controller

		// Create HTML slot elements
		for (l = 0; l < instance.slotData.length; l += 1) {
			// Create the slot
			ul = document.createElement('ul');
			out = '';
			for (m = 0, mlen = instance.slotData[l].values.length; m < mlen; m++) {
			  i = instance.slotData[l].values[m];
			  var style = '';
        if (i.value === instance.slotData[l].highlightValue) {
          style = ' class="sw-highlight"';
        }
				out += '<li' + style + '>' + i.label + '<' + '/li>';
			}
			ul.innerHTML = out;

			div = document.createElement('div');		// Create slot container
			div.className = instance.slotData[l].style;		// Add styles to the container
			div.appendChild(ul);
	
			// Append the slot to the wrapper
			instance.swSlots.appendChild(div);
			
			ul.slotPosition = l;			// Save the slot position inside the wrapper
			ul.slotYPosition = 0;
			ul.slotWidth = 0;
			ul.slotMaxScroll = instance.swSlotWrapper.clientHeight - ul.clientHeight - 86;
			ul.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';		// Add default transition
			
			instance.slotEl.push(ul);			// Save the slot for later use

			// Place the slot to its default position (if other than 0)
			if (instance.slotData[l].defaultValue) {
				instance.scrollToValue(l, instance.slotData[l].defaultValue);	
			}
		}

		instance.calculateSlotsWidth();

		// Global events
		//document.addEventListener(START_EVENT, instance, false);			// Prevent page scrolling
		//document.addEventListener(MOVE_EVENT, instance, false);			// Prevent page scrolling
		window.addEventListener('orientationchange', instance, true);		// Optimize SW on orientation change
		//window.addEventListener('scroll', instance, true);				// Reposition SW on page scroll

		// Add scrolling to the slots
		instance.swFrame.addEventListener(START_EVENT, instance, false);
	},

	open: function () {
		instance.create();
		/*
		instance.swWrapper.style.webkitTransitionTimingFunction = 'ease-out';
		instance.swWrapper.style.webkitTransitionDuration = '400ms';
		instance.swWrapper.style.webkitTransform = 'translate3d(0, -260px, 0)';
		 */
	},
	
	
	/**
	 *
	 * Unload
	 *
	 */

	destroy: function () {
		instance.swWrapper.removeEventListener('webkitTransitionEnd', instance, false);

		instance.swFrame.removeEventListener(START_EVENT, instance, false);

		//document.getElementById('sw-cancel').removeEventListener(START_EVENT, instance, false);
		//document.getElementById('sw-done').removeEventListener(START_EVENT, instance, false);

		document.removeEventListener(START_EVENT, instance, false);
		document.removeEventListener(MOVE_EVENT, instance, false);
		window.removeEventListener('orientationchange', instance, true);
		window.removeEventListener('scroll', instance, true);
		
		while (instance.swSlots.childNodes.length >= 1) {
		  instance.swSlots.removeChild(instance.swSlots.firstChild);       
    } 
		instance.slotData = [];
		
		instance.reset();
		
		//document.body.removeChild(document.getElementById('sw-wrapper'));
	},
	
	close: function () {
	  /*
		instance.swWrapper.style.webkitTransitionTimingFunction = 'ease-in';
		instance.swWrapper.style.webkitTransitionDuration = '400ms';
		instance.swWrapper.style.webkitTransform = 'translate3d(0, 0, 0)';
		 */
		
		instance.swWrapper.addEventListener('webkitTransitionEnd', instance, false);
	},

	/**
	 *
	 * Generic methods
	 *
	 */
	addSlot: function (values, style, defaultValue, highlightValue) {
		if (!style) {
			style = '';
		}
		
		style = style.split(' ');
		
		for (var i = 0; i < style.length; i += 1) {
			style[i] = 'sw-' + style[i];
		}
		
		style = style.join(' ');
		
		var obj = { 'values': values, 'style': style, 'defaultValue': defaultValue, 'highlightValue': highlightValue };
		instance.slotData.push(obj);
	},

	setCallbacks: function(callbacks) {
	  instance.callbacks = callbacks;
	},

	getSelectedValues: function () {
		var index, count,
		    i,
			  keys = [], values = [];

		for (i in instance.slotEl) {
			// Remove any residual animation
			instance.slotEl[i].removeEventListener('webkitTransitionEnd', instance, false);
			instance.slotEl[i].style.webkitTransitionDuration = '0';

			if (instance.slotEl[i].slotYPosition > 0) {
				instance.setPosition(i, 0);
			} else if (instance.slotEl[i].slotYPosition < instance.slotEl[i].slotMaxScroll) {
				instance.setPosition(i, instance.slotEl[i].slotMaxScroll);
			}

			index = -Math.round(instance.slotEl[i].slotYPosition / instance.cellHeight);

      i = instance.slotData[i].values[index];
			keys.push(i.label);
			values.push(i.value);
		}

		return { 'keys': keys, 'values': values };
	},

	/**
	 *
	 * Rolling slots
	 *
	 */

	setPosition: function (slot, pos) {
		instance.slotEl[slot].slotYPosition = pos;
		instance.slotEl[slot].style.webkitTransform = 'translate3d(0, ' + pos + 'px, 0)';
	},
	
	scrollStart: function (e) {
		// Find the clicked slot
		var origin = findPos(instance.swSlots);
		var xPos = (isTouch? e.targetTouches[0].clientX: e.clientX) - origin.left;	// Clicked position minus left offset (should be 11px)

		// Find tapped slot
		var slot = 0;
		for (var i = 0; i < instance.slotEl.length; i += 1) {
			slot += instance.slotEl[i].slotWidth;
			
			if (xPos < slot) {
				instance.activeSlot = i;
				break;
			}
		}

		// If slot is readonly do nothing
		if (instance.slotData[instance.activeSlot].style.match('readonly')) {
			instance.swFrame.removeEventListener(MOVE_EVENT, instance, false);
			instance.swFrame.removeEventListener(END_EVENT, instance, false);
			if (isTouch) {
			  instance.swFrame.removeEventListener(CANCEL_EVENT, instance, false);
			}
			return false;
		}

		instance.slotEl[instance.activeSlot].removeEventListener('webkitTransitionEnd', instance, false);	// Remove transition event (if any)
		instance.slotEl[instance.activeSlot].style.webkitTransitionDuration = '0';		// Remove any residual transition
		
		// Stop and hold slot position
		var theTransform = window.getComputedStyle(instance.slotEl[instance.activeSlot]).webkitTransform;
		if (theTransform !== 'none') {
  		theTransform = new WebKitCSSMatrix(theTransform).m42;
  		if (theTransform != instance.slotEl[instance.activeSlot].slotYPosition) {
  			instance.setPosition(instance.activeSlot, theTransform);
  		}
		}

		instance.startY = (isTouch? e.targetTouches[0].clientY: e.clientY);
		instance.scrollStartY = instance.slotEl[instance.activeSlot].slotYPosition;
		instance.scrollStartTime = e.timeStamp;

		instance.swFrame.addEventListener(MOVE_EVENT, instance, false);
		instance.swFrame.addEventListener(END_EVENT, instance, false);
    if (isTouch) {
      instance.swFrame.removeEventListener(CANCEL_EVENT, instance, false);
    }
		
		return true;
	},

	scrollMove: function (e) {
		var topDelta = (isTouch? e.targetTouches[0].clientY: e.clientY) - instance.startY;

		if (instance.slotEl[instance.activeSlot].slotYPosition > 0 || instance.slotEl[instance.activeSlot].slotYPosition < instance.slotEl[instance.activeSlot].slotMaxScroll) {
			topDelta /= 2;
		}
		
		instance.setPosition(instance.activeSlot, instance.slotEl[instance.activeSlot].slotYPosition + topDelta);
		instance.startY = (isTouch? e.targetTouches[0].clientY: e.clientY);

		// Prevent slingshot effect
		if (e.timeStamp - instance.scrollStartTime > 80) {
			instance.scrollStartY = instance.slotEl[instance.activeSlot].slotYPosition;
			instance.scrollStartTime = e.timeStamp;
		}
	},
	
	scrollEnd: function (e) {
		instance.swFrame.removeEventListener(MOVE_EVENT, instance, false);
		instance.swFrame.removeEventListener(END_EVENT, instance, false);
		if (isTouch) {
		  instance.swFrame.removeEventListener(CANCEL_EVENT, instance, false);
		}

		// If we are outside of the boundaries, let's go back to the sheepfold
		if (instance.slotEl[instance.activeSlot].slotYPosition > 0 || instance.slotEl[instance.activeSlot].slotYPosition < instance.slotEl[instance.activeSlot].slotMaxScroll) {
			instance.scrollTo(instance.activeSlot, instance.slotEl[instance.activeSlot].slotYPosition > 0 ? 0 : instance.slotEl[instance.activeSlot].slotMaxScroll);
			return false;
		}

		// Lame formula to calculate a fake deceleration
		var scrollDistance = instance.slotEl[instance.activeSlot].slotYPosition - instance.scrollStartY;

		// The drag session was too short
		if (scrollDistance < instance.cellHeight / 1.5 && scrollDistance > -instance.cellHeight / 1.5) {
			if (instance.slotEl[instance.activeSlot].slotYPosition % instance.cellHeight) {
				instance.scrollTo(instance.activeSlot, Math.round(instance.slotEl[instance.activeSlot].slotYPosition / instance.cellHeight) * instance.cellHeight, '100ms');
			}

			return false;
		}

		var scrollDuration = e.timeStamp - instance.scrollStartTime;

		var newDuration = (2 * scrollDistance / scrollDuration) / instance.friction;
		var newScrollDistance = (instance.friction / 2) * (newDuration * newDuration);
		
		if (newDuration < 0) {
			newDuration = -newDuration;
			newScrollDistance = -newScrollDistance;
		}

		var newPosition = instance.slotEl[instance.activeSlot].slotYPosition + newScrollDistance;

		if (newPosition > 0) {
			// Prevent the slot to be dragged outside the visible area (top margin)
			newPosition /= 2;
			newDuration /= 3;

			if (newPosition > instance.swSlotWrapper.clientHeight / 4) {
				newPosition = instance.swSlotWrapper.clientHeight / 4;
			}
		} else if (newPosition < instance.slotEl[instance.activeSlot].slotMaxScroll) {
			// Prevent the slot to be dragged outside the visible area (bottom margin)
			newPosition = (newPosition - instance.slotEl[instance.activeSlot].slotMaxScroll) / 2 + instance.slotEl[instance.activeSlot].slotMaxScroll;
			newDuration /= 3;
			
			if (newPosition < instance.slotEl[instance.activeSlot].slotMaxScroll - instance.swSlotWrapper.clientHeight / 4) {
				newPosition = instance.slotEl[instance.activeSlot].slotMaxScroll - instance.swSlotWrapper.clientHeight / 4;
			}
		} else {
			newPosition = Math.round(newPosition / instance.cellHeight) * instance.cellHeight;
		}

		instance.scrollTo(instance.activeSlot, Math.round(newPosition), Math.round(newDuration) + 'ms');
 
		return true;
	},

	scrollTo: function (slotNum, dest, runtime) {
		instance.slotEl[slotNum].style.webkitTransitionDuration = runtime ? runtime : '100ms';
		instance.setPosition(slotNum, dest ? dest : 0);

		// If we are outside of the boundaries go back to the sheepfold
		if (instance.slotEl[slotNum].slotYPosition > 0 || instance.slotEl[slotNum].slotYPosition < instance.slotEl[slotNum].slotMaxScroll) {
			instance.slotEl[slotNum].addEventListener('webkitTransitionEnd', instance, false);
		} else {
		  var index = -Math.round(instance.slotEl[slotNum].slotYPosition / instance.cellHeight);
      var target = instance.slotEl[slotNum].childNodes[index];
      if (hasClass(target, 'sw-disabled')) {
        // If we are on a disabled position, move backward to one that aren't.
        for (var i=index-1; i >= 0; i--) {
          target = instance.slotEl[slotNum].childNodes[i];
          if (!hasClass(target, 'sw-disabled')) {
            instance.scrollTo(slotNum, -(i * instance.cellHeight), '500ms');
            break;
          }
        }
      } else if (!!instance.callbacks && !!instance.callbacks.onValueUpdated) {
		    instance.callbacks.onValueUpdated(instance.getSelectedValues());
		  }
		}
	},

	scrollToValue: function (slot, value) {
		var yPos, i, m, mlen;

		instance.slotEl[slot].removeEventListener('webkitTransitionEnd', instance, false);
		instance.slotEl[slot].style.webkitTransitionDuration = '0';

		for (m = 0, mlen = instance.slotData[slot].values.length; m < mlen; m++) {
		  var i = instance.slotData[slot].values[m];
			if (i.value === value) {
				yPos = -m * instance.cellHeight;
				instance.setPosition(slot, yPos);
				break;
			}
		}
	},
	
  disableValue: function (slot, value) {
    var yPos, i, m, mlen, updated;

    for (m = 0, mlen = instance.slotData[slot].values.length; m < mlen; m++) {
      var i = instance.slotData[slot].values[m];
      if (i.value === value) {
        yPos = -m * instance.cellHeight;
        var target = instance.slotEl[slot].childNodes[m];
        updated = addClass(target, 'sw-disabled');
        break;
      }
    }
    var index = -Math.round(instance.slotEl[slot].slotYPosition / instance.cellHeight);
    if (updated && m===index) {
      // If it is on a disabled position, move backward to one that isn't.
      for (var i=m-1; i >= 0; i--) {
        target = instance.slotEl[slot].childNodes[i];
        if (!hasClass(target, 'sw-disabled')) {
          instance.scrollTo(slot, -(i * instance.cellHeight), '500ms');
          break;
        }
      }
    }
  },

  enableValue: function (slot, value) {
    var yPos, i, m, mlen, updated;

    for (m = 0, mlen = instance.slotData[slot].values.length; m < mlen; m++) {
      var i = instance.slotData[slot].values[m];
      if (i.value === value) {
        yPos = -m * instance.cellHeight;
        var target = instance.slotEl[slot].childNodes[m];
        updated = removeClass(target, 'sw-disabled');
        break;
      }
    }
  },

	backWithinBoundaries: function (e) {
		e.target.removeEventListener('webkitTransitionEnd', instance, false);

		instance.scrollTo(e.target.slotPosition, e.target.slotYPosition > 0 ? 0 : e.target.slotMaxScroll, '150ms');
		return false;
	}
};

for (var i=0, len=slots.length; i<len; i++) {
  var slot = slots[i];
  instance.addSlot(slot.values, slot.style, slot.defaultValue, slot.highlightValue);
}
instance.setCallbacks(callbacks);
instance.create();
return instance;
};

var DateFormats = new function() {
  var instance = this;
  var monthdays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // courtesy of Mike Koss http://wiki.pageforest.com/#js-patterns/locale-strings
  instance.getLocaleDateFormat = function() {
    var d = new Date(2001, 1, 3, 13, 14, 15);
    var patterns = [
      ['Saturday', 'dddd'],
      ['2001', 'YYYY'], ['01', 'YY'],
      ['February', 'MMMM'], ['Feb', 'MMM'], ['02', 'MM'], ['2', 'M'],
      ['03', 'DD'], ['3', 'D']
    ];

    var ds = d.toLocaleDateString();
    for (var i = 0; i < patterns.length; i++) {
      var pattern = patterns[i];
      ds = ds.replace(pattern[0], pattern[1]);
    }
    return ds;
  };

  instance.getLocaleTimeFormat = function() {
    var d = new Date(2001, 1, 3, 13, 14, 15);
    var patterns = [
      ['13', 'HH'], ['01', 'hh'],
      ['14', 'mm'],
      ['15', 'ss'],
      ['1', 'h'],
    ];

    var ds = d.toLocaleTimeString();
    ds = ds.replace(/Saturday[, ]*/, '');
    for (var i = 0; i < patterns.length; i++) {
      var pattern = patterns[i];
      ds = ds.replace(pattern[0], pattern[1]);
    }
    return ds;
  };

  instance.getLocaleDateOrder = function() {
    var ds = instance.getLocaleDateFormat();
    var orders = [
      [/D.*M.*Y/, 'DMY'],
      [/Y.*M.*D/, 'YMD']
    ];
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      if (order[0].test(ds)) {
        return order[1];
      }
    }
    return 'MDY';
  };
  // -- Mike Koss 

  instance.convertObjectToDate = function(obj, includetime) {
    var enddate = new Date(2000, 5, 15); // use middle day to avoid roll over when individual value is set
    enddate.setFullYear(obj.year);
    enddate.setMonth(obj.month);
    enddate.setDate(obj.date);
    if (includetime) {
      enddate.setHours(obj.hours);
      enddate.setMinutes(obj.minutes);
    }
    return enddate;
  };

  instance.convertDateToObject = function(enddate,  includetime) {
    var jso = {
        year: enddate.getFullYear(), 
        month: enddate.getMonth(), 
        date: enddate.getDate()
    };
    if (includetime) {
      jso.hours = enddate.getHours();
      jso.minutes = enddate.getMinutes();
    }
    return jso;
  };

  instance.cloneDateObject = function(obj, includetime, includeduration) {
    var jso = {
        year: obj.year, 
        month: obj.month, 
        date: obj.date
    };
    if (includetime) {
      jso.hours = obj.hours;
      jso.minutes = obj.minutes;
    }
    if (includeduration) {
      jso.duration = obj.duration;
    }
    return jso;
  };

  instance.getOffsetDay = function(reference, offset) {
    var result;

    if (offset == 0) {
      result = reference;
    } else {
      var milli = reference.getTime();
      milli += offset * 24 * 60 * 60 * 1000;
      result = new Date(milli);
    }
    return result;
  };

  instance.getOffsetMinute = function(reference, offset) {
    var result;

    if (offset == 0) {
      result = reference;
    } else {
      var milli = reference.getTime();
      milli += offset * 60 * 1000;
      result = new Date(milli);
    }
    return result;
  };

  instance.getMonthDays = function (year, month) {
    var result;
    if (month !== 1) { // Feb
      result = monthdays[month];
    } else {
      var isLeap = new Date(year,1,29).getDate() == 29;
      if (isLeap) {
        result = 29;
      } else {
        result = 28;
      }
    }
    return result;
  };

  instance.isSameDay = function(left, right) {
    return left.getFullYear() === right.getFullYear() 
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
  };
  
  instance.getStartEndFormat = function(dateobject) {
    var startdate, enddate, enddateString, format;

    startdate = new Date(2000, 5, 15); // use middle day to avoid roll over when individual value is set
    startdate.setFullYear(dateobject.year);
    startdate.setMonth(dateobject.month);
    startdate.setDate(dateobject.date);
    if (dateobject.hours !== undefined && dateobject.hours !== null) { 
      startdate.setHours(dateobject.hours);
      startdate.setMinutes(dateobject.minutes);
      format = "ddd, MMM dd yyyy hh:mm tt";
    } else {
      format = "ddd, MMM dd yyyy";
    }

    enddate = new Date(startdate.getTime() + dateobject.duration * 60 * 1000);
    if (instance.isSameDay(startdate, enddate) && !!dateobject.hours) {
      enddateString = enddate.toString("hh:mm tt");
    } else {
      enddateString = enddate.toString(format);
    }

    return {startdate: startdate.toString(format), enddate: enddateString, format: format}; 
  };

  instance.getDateObject = function(startdate, enddate, format) {
    var result;

    var start, end, duration, hastime;
    hastime = /mm/.test(format);

    if (!!startdate) {
      start = Date.parse(startdate);
    } else {
      start = new Date();
    }
    if (!!enddate) {
      end = Date.parse(enddate);
      duration = (end.getTime() - start.getTime()) / (60 * 1000);
    } else {
      duration = 60;
    }

    result = instance.convertDateToObject(start, hastime);
    result.duration = duration;
    return result;
  };

  return instance;
};
