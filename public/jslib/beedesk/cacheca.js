/*
 * Copyright (c) 2010 - 2011, BeeDesk, Inc., unless otherwise noted.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BeeDesk, Inc. AND ITS LICENSORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

/**
 * BareSet is a generic model (as in Model/View/Controller). It provides
 * a few common functionalities:
 *
 * 1) CRUD method to access item in the set
 * 2) Finders methods
 * 3) interface for initialization / finalization
 *
 * @author: tyip AT beedesk DOT com
 */
function BareSet(conf) {

  this.init = function() {};

  this.start = function() {};

  // CRUDB ([C]create, [R]read, [U]update, [D]remove, [B]browse and find)
  /**
   * browse(function fn, function err, [function sumfn], [{} filters])
   */
  this.browse = function(fn, err, sumfn, filters) {};

  this.find = function(filters) {};

  this.findOnce = function(filters) {};

  this.read = function(itemId, fn, err) {};

  this.update = function(itemId, newState, oldState, fn, err) {};

  this.create = function(newState, fn, err) {};

  this.remove = function(itemId, fn, err) {};

  this.name = (conf && conf.name) || "Generic DataSet";

}

/**
 * Binder is a dispatch multiplexer.
 *
 * @param conf
 * @author: tyip AT beedesk DOT com
 */
function Binder(conf) {

  this.bind = function(type, fn) {};

  this.unbind = function(type, fn) {};

  this.trigger = function(type, event) {};

}

/**
 * DataSet is a BareSet that provides events.
 *
 * Supports '*', 'added', 'updated', 'removed' events.
 * Supports 'error/*', 'error/addded', 'error/updated', 'error/removed' events
 *
 * @author: tyip AT beedesk DOT com
 */
function DataSet(conf) {

  var instance = $.extend(new BareSet(conf), new Binder(conf));

  instance.snapbind = function(type, fn) {};

  return instance;
}

/**
 * Helper class to enable code reuse for common functionalities
 */
var CRUDs = new function() {
  var instance = this;
  this.DEFAULT_ERR = function(msg) {
    console.error(msg);
  };
  this.EMPTY_FN = function() {

  };
  this.getCheckedErrorFn = function(errFn) {
    return errFn || instance.DEFAULT_ERR;
  };
  this.getCheckedFn = function(fn) {
    return fn || instance.EMPTY_FN;
  };
  this.snapbind = function(binder, status, params) {
    Arguments.assertNonNullDataObject(params, binder.name + ".snapbind: expect argument 'params'.");

    if (Arguments.isNonNullFn(params.initialized)) {
      if (status.initialized) {
        params.initialized();
      }
      binder.bind("initialized", params.initialized);
    }
    if (Arguments.isNonNullFn(params.started)) {
      if (status.started) {
        params.started();
      }
      binder.bind("started", params.initialized);
    }
    if (Arguments.isNonNullFn(params.added)) {
      if (status.initialized) {
        //@TODO potential timing issue when the set is "starting"
        // duplicated entries might result.
        binder.browse(function(id, item) {
          params.added({entryId: id, entry: item});
        }, function() {}, function() {});
      }
      binder.bind("added", params.added);
    }
    if (Arguments.isNonNullFn(params.removed)) {
      binder.bind("removed", params.removed);
    }
    if (Arguments.isNonNullFn(params.updated)) {
      binder.bind("updated", params.updated);
    }
    if (Arguments.isNonNullFn(params.error)) {
      binder.bind("error", params.error);
    }
  };
};

/**
 * SimpleBareSet is an implementation of BareSet. It keeps all entry
 * in an associate hash object.
 *
 * @author: tyip AT beedesk DOT com
 */
function SimpleBareSet(conf) {
  var instance = this;

  conf = $.extend({
    name: "SimpleBareSet",
    getId: function(entry) {
      idcount += 1;
      return idcount;
    },
    setId: function(entry) {
      entry.id = idcount;
      idcount += 1;
      return entry.id;
    },
    entryIn: function(id, entry) {
      return $.extend({}, entry);
    },
    entryOut: function(id, entry) {
      return $.extend({}, entry);
    },
    finder: function(entry, filters) {
      var result;
      if (filters === null || filters === undefined) {
        result = true;
      } else if (!$.isFunction(filters)) {
        var matchAll = true;
        var matchSome = false;
        for (var key in filters) {
          if (entry === undefined) {
            // problematic
            matchAll = false;
            break;
          } else if (filters[key] !== entry[key]) {
            matchAll = false;
            break;
          }
          matchSome = true; // make sure filter is non-empty
        }
        result = matchSome && matchAll;
      } else {
        result = filters(entry);
      }
      return result;
    }
  }, conf);

  var idcount    = 10000;
  var entries    = {};

  this.findOnce = function(filters) {
    var result;
    for (var id in entries) {
      var entry = entries[id];

      var matched = conf.finder(entry, filters);
      if (matched) {
        result = id;
        break;
      }
    }
    return result;
  };

  this.find = function(filters) {
    var result = [];
    for (var id in entries) {
      var entry = entries[id];

      var matched = conf.finder(entry, filters);
      if (matched) {
        result.push(id);
      }
    }
    return result;
  };

  this.browse = function(fn, errFn, sumFn, filters) {
    if (!!filters) {
      console.error("browse(filter) is not supported!");
    }
    var count = 0;
    var cont;
    for (var id in entries) {
      count++;
      if (conf.finder(entries[id], filters)) {
        cont = fn(id, entries[id]);
        if (cont === false)
          break;
      }
    }
    if (!!sumFn && $.isFunction(sumFn)) {
      sumFn(count, cont);
    }
    return count;
  };

  this.read = function(entryId, fn, errFn) { // "read into"
    Arguments.assertNonNull(entryId, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = CRUDs.getCheckedErrorFn(errFn);

    var result;
    var rawentry = entries[entryId];
    if (!!rawentry) {
      result = conf.entryOut(entryId, rawentry);
      if (!!result) {
        fn(entryId, result);
      } else {
        errFn(entryId, conf.name + ".read() conversion problem: " + entryId + '  ' + uneval(conf.entryOut));
      }
    } else {
      errFn(entryId, conf.name + ".read() cannot find item: " + entryId);
    }
    return result;
  };

  this.create = function(entry, fn, errFn) {
    Arguments.assertNonNull(entry, conf.name + "(SimpleBareSet).create: expect argument 'entry'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var id = conf.setId(entry);
    if (Arguments.isNonNull(id)) {
      var content = conf.entryIn(id, entry);
      if (Arguments.isNonNull(content)) {
        entries[id] = content;
        fn(id, entry);
      } else {
        errFn('failed to convert entry: ' + uneval(entry));
      }
    } else {
      errFn('id problem: ' + uneval(entry) + ' conf.setId: ' + uneval(conf.setId)  );
    }
  };

  this.update = function(entryId, newentry, oldentry, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(newentry, conf.name + ".update: expect argument 'newentry'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var rawentry = entries[entryId];
    if (Arguments.isNonNull(rawentry)) {
      result = conf.entryOut(entryId, rawentry);
      var converted = conf.entryIn(entryId, newentry);
      if (Arguments.isNonNull(converted)) {
        entries[entryId] = converted;
        fn(entryId, newentry);
      } else {
        errFn(id, 'problem with conversion: ' + entryId);
      }
    } else {
      errFn('updating non-exist id: ' + entryId);
    }
  };

  this.remove = function(entryId, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + '.remove: expect entryId.');
    Arguments.warnNonNull(fn, conf.name + '.remove: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var rawentry = entries[entryId];
    if (Arguments.isNonNull(rawentry)) {
      delete entries[entryId];
      result = conf.entryOut(entryId, rawentry);
      fn(entryId, result);
    } else {
      errFn(entryId, 'cannot find item: ' + entryId);
    }
  };

  this.removeAll = function() {
    var count = 0;
    var all = this.browse(function(id, item) {
      count++;
      instance.remove(id);
    });
    return count;
  };
};

/**
 * SimpleBinder is a simple implementation of Binder which a dispatcher.
 * Upon receiving an event (via trigger()), it dispatches it to all
 * handlers.
 *
 * @param conf
 * @author: tyip AT beedesk DOT com
 */
function SimpleBinder(conf) {
  var handlers = new SimpleBareSet(conf);
  this.bind = function(type, fn) {
    return handlers.create({type: type, fn: fn}, function() {}, function() {});
  };
  this.unbind = function(type, fn) {
    return handlers.remove({type: type, fn: fn}, function() {}, function() {});
  };
  this.trigger = function(type, list) {
    var count = 0;
    var contin; // stop propagation

    var args = Array.prototype.slice.call(arguments).splice(1);
    var ids = handlers.find({type: type});
    for (var j=0, len=ids.length; j < len; j++) {
      handlers.read(ids[j], function(id, handler) {
        count++;
        contin = handler.fn.apply(this, args);
        if (contin === false) {
          return false;
        }
      }, function(id, msg) {
        console.error(conf.name + '.handlers:' + uneval(handlers));
      });
    }
    if (contin !== false) {
      ids = handlers.find({type: '*'});
      for (var j=0, len=ids.length; j < len; j++) {
        handlers.read(ids[j], function(id, handler) {
          count++;
          contin = handler.fn.apply(this, args);
          if (contin === false) {
            return false;
          }
        }, function(id) {
          console.error(conf.name + '.handlers:' + uneval(handlers));
        });
      }
    }
    return count;
  };
};

/**
 * Register for dataset
 */
var Cacheca = new function() {
  var instance = $.extend(this, new SimpleBinder({name: 'registered-datasets'}));
  var sets = {};
  this.register = function(dataset) {
    var name = !!dataset.name? dataset.name: null;
    if (!name) {
      throw "dataset does not has a name";
    }
    sets[name] = dataset;
    instance.trigger('added', name, dataset);
  };
  this.list = function() {
    return $.extend({}, sets);
  };
  this.get = function(key) {
    return sets[key];
  };
};

/**
 * SimpleDataSet is a simple implementation of DataSet.
 *
 * By default, it use SimpleBareSet as the underneath components to
 * store the actual entry. It can be overriden by conf.innerset.
 *
 * @see DataSet
 */
function SimpleDataSet(conf) {
  var started     = false;
  var initialized = false;

  var myconf = $.extend({
    init: function() {
    },
    start: function() {
    },
    isEventEnabled: function() {
      return true;
    },
    isBrowseFilterSupported: false
  }, conf);

  var entries = new DataSet(conf);
  $.extend(entries, new SimpleBinder({name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')}));

  var getMyErrFn = function(err) {
    var mine = function(exception) {
      if (!!err) {
        err(exception);
      }
      entries.trigger("error", exception);
    };
    return mine;
  };

  var innerset = myconf.innerset || new SimpleBareSet($.extend({name: conf.name + ':entry-inner'}, conf));

  entries.init = function() {
    myconf.init();
    if (!!innerset.init) {
      innerset.init();
    }
    initialized = true;
  };

  entries.start = function() {
    myconf.start();
    if (!!innerset.start) {
      innerset.start();
    }
    entries.browse(function(id, item) {
      if (myconf.eagarbrowse) {
        entries.trigger('added', {entryId: id, entry: item});
      } else {
        entries.read(id, function(id, item) {
          entries.trigger('added', {entryId: id, entry: item});
        });
      }
    }, function(exception) {
      entries.trigger("error", exception);
    });
    started = true;
  };

  entries.snapbind = function(params) {
    CRUDs.snapbind(entries, {initialized: initialized, started: started}, params);
  };

  entries.read = function(entryId, fn, errFn) {
    Arguments.assertNonNull(entryId, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    var myErrFn = getMyErrFn(errFn);

    innerset.read(entryId, fn, myErrFn);
  };

  entries.create = function(entry, fn, errFn) {
    Arguments.assertNonNull(entry, conf.name + "(SimpleDataSet).create: expect argument 'entry'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    var myErrFn = getMyErrFn(errFn);

    innerset.create(entry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        entries.trigger('added', {entryId: id, entry: item});
      }
    }, myErrFn);
  };

  entries.update = function(entryId, newentry, oldentry, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(newentry, conf.name + ".update: expect argument 'newentry'.");

    fn = CRUDs.getCheckedFn(fn);
    var myErrFn = getMyErrFn(errFn);

    innerset.update(entryId, newentry, oldentry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        var event = {entryId: entryId, entry: newentry};
        if (myconf.useRemovedAdded === true) {
          entries.trigger('removed', event);
          entries.trigger('added', event);
        } else {
          entries.trigger('updated', event);
        }
      }
    }, myErrFn);
  };

  entries.remove = function(entryId, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + '.remove: expect entryId.');
    Arguments.warnNonNull(fn, conf.name + '.remove: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    var myErrFn = getMyErrFn(errFn);

    innerset.remove(entryId, oldentry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        entries.trigger('removed', {entryId: id, oldentry: item});
      }
    }, myErrFn);
  };

  entries.browse = function(fn, err, sumFn, filters) {
    var myErrFn = getMyErrFn(err);
    sumFn = !!sumFn? sumFn: function() {}; 

    if (myconf.isBrowseFilterSupported || filters === undefined || filters === null) {
      innerset.browse(fn, myErrFn, sumFn, filters);
    } else {
      var count = 0;
      innerset.browse(function(id, item) {
        if (Items.match(filters, id, item)) {
          count++;
          return fn(id, item);
        }
      }, myErrFn, function() {
        sumFn(count);
      });
    }
  };

  entries.findOnce = function(filters) {
    var result = innerset.findOnce(filters);
    return result;
  };

  entries.find = function(filters) {
    var result = innerset.find(filters);
    return result;
  };

  entries.removeAll = function() {
    var result = innerset.removeAll();
    return result;
  };

  return entries;
};

/**
 * CachedDataSet is an simple implementation of DateSet that provides
 * caching.
 *
 * The conf.storeset is mandatory. An Ajax source might be such a storeset.
 * It is the authoritative set.
 *
 * The conf.cacheset is an SimpleBareSet by default. It can be
 * overridden.
 *
 * The CachedBareSet cache all entries from storeset into an cacheset.
 *
 * @see DataSet
 * Author: tyip AT beedesk DOT com
 */
function CachedDataSet(conf) {

  var myconf = $.extend({
    tokens: function(item) {
      return [item.id];
    },
    normalize: function(data) {
      return data;
    }
  }, conf);

  Arguments.assertNonNullString(name, "[CachedBareSet] " + "Conf 'name' must be defined.");
  Arguments.assertNonNull(myconf.storeset, "[model:" + myconf.name + "] " + "Conf 'storeset' must be defined.");
  Arguments.warnNonNull(myconf.cacheset, "[model:" + myconf.name + "] " + "Default 'in-meory' cache is used.");

  var storeset = myconf.storeset;
  var cacheset = myconf.cacheset || new SimpleBareSet($.extend({name: myconf.name + ':cache'}, conf));

  var innerset = new DataSet({name: myconf.name + ':cache-wrapper'});

  var fullset = new SimpleDataSet($.extend({
    name: conf.name + ':cachedstore',
    innerset: innerset
  }, conf));

  var internalerr = function(exception) {
    fullset.trigger("error", exception);
  };

  storeset.bind('added', function(event) {
    cacheset.read(event.entryId, function() {
      console.warn('[cacheset merge] item added to storeset is already exists the cache.');
    }, function(id, item) {
      storeset.read(id, function(id, item) {
        cacheset.create(item, function(id, item) {
          fullset.trigger('added', {entryId: id, entry: item});
        }, internalerr);
      }, internalerr);
    });
  });
  storeset.bind('removed', function(event) {
    cacheset.read(event.entryId, function(id, item) {
      cacheset.remove(id, function(id, item) {
        fullset.trigger('removed', {entryId: id, entry: item});
      }, internalerr);
    }, function(exception) {
      console.warn('[cacheset merge] item removed from storeset cannot be found. id: ' + exception.id);
      internalerr(exception);
    });
  });
  storeset.bind('updated', function(event) {
    storeset.read(event.entryId, function(id, item) {
      cacheset.read(event.entryId, function(id, item) {
        cacheset.update(item, function(id, item) {
          fullset.trigger('update', {entryId: id, entry: item});
        }, internalerr);
      }, function(id) {
        cacheset.create(item, function(id, item) {
          fullset.trigger('added', {entryId: id, entry: item});
        }, function(id) {
          console.warn('[cacheset merge] update item cannot be added or updated. id: ' + id);
        });
      });
    }, internalerr);
  });

  var oldinit = innerset.init;
  innerset.init = function() {
    if (!!oldinit) {
      oldinit();
    }
    if (!!cacheset.init) {
      cacheset.init();
    }
    if (!!storeset.init) {
      storeset.init();
    }
  };

  var oldstart = innerset.start;
  innerset.start = function() {
    if (!!oldstart) {
      oldstart();
    }
    if (!!cacheset.start) {
      cacheset.start();
    }
    cacheset.browse(function(id, item) {
      fullset.trigger('added', {entryId: id, entry: item});
    }, internalerr);
    if (!!storeset.start) {
      storeset.start();
    }

    var merge = function(since) {
      var opt;
      if (!!since) {
        // @TODO since: is not working
        //opt = {namedquery: 'modified-since', params: {since: since}};
        //opt = {namedquery: 'modified-since'};
      }
      console.log('merge() called');
      storeset.browse(function(id, item) { // this query have all item modified since
        cacheset.read(id, function() {}, function(id) { // make sure cache does *not* have it.
          storeset.read(id, function(id, item) {
            cacheset.create(item, function(id, item) { // create item
              fullset.trigger('added', {entryId: id, entry: item});
            });
          }, internalerr);
        });
      },
      internalerr,
      function(count) {
        if (count === 0) {
          console.log("[" + storeset.name + "] browse(" + uneval(opt) + ") yield no element.");
        } else {
          console.log("[" + storeset.name + "] merged.");
        }
      },
      opt);
    };

    // We need localStorage to keep the bookmark for this entity
    // storage will obtain a list, and merge with cacheset
    // storage will receive event, and merge with cacheset
    cacheset.browse(function(id, item) { // this query get last-modified time
      console.log('checking modified since: [' + item.modified + ']' + ' typeof: ' + typeof(item.modified));
      var lastmodified = item.modified;
      if (!lastmodified) {
        lastmodified = Dates.toISOString(new Date(0));
      }
      var date = Dates.fromISOString(lastmodified);
      if (!date) {
        date = new Date(0);
      }
      var added = date.addHours(-1);
      var offsetdate = Dates.toISOString(added);
      console.log(typeof(item.modified) + ": " + lastmodified + " parsed: " + date.toUTCString() + " offset: " + offsetdate);

      merge(offsetdate);
      return false; // we only need one item
    },
    internalerr,
    function(count) {
      if (count === 0) {
        var zerodate = "1970-01-01T00:00:00.0000Z";
        merge(zerodate);
      }
    }, {namedquery: 'last-modified'});
    return true;
  };

  innerset.browse = function(fn, err, sumFn, filter) {
    cacheset.browse.apply(this, arguments);
  };

  innerset.read = function(itemId, fn, errFn) {
    Arguments.assertNonNull(itemId, conf.name + '.read: expect itemid.');
    Arguments.assertNonNull(fn, conf.name + '.read: expect fn.');

    errFn = CRUDs.getCheckedErrorFn(errFn);

    cacheset.read(itemId, fn, function(id) {
      entry = storeset.read(itemId, function(id, item) {
        cacheset.create(item, function(id, item) {
          fn(id, item);
        });
      }, errFn);
    }, errFn);
  };

  innerset.update = function(itemId, newentry, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(itemId, conf.name + '.update: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.updated: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var oldState = cacheset.read(itemId);
    storenewentryte(itemId, newentry, oldentry, function(id, newentry, oldentry) {
      cachenewentryte(itemId, newentry, oldentry, fn, errFn);
    }, errFn);
  };

  innerset.create = function(newState, fn, errFn) {
    Arguments.assertNonNull(newState, conf.name + '.create: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.create: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    storeset.create(newState, function(id, entry) {
      cacheset.create(newState, function(id, entry) {
        fn(id, entry);
      }, errFn);
    }, errFn);
  };

  innerset.remove = function(itemId, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(itemId, conf.name + '.remove: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.remove: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    storeset.remove(itemId, oldentry, function(itemId, item) {
      cacheset.remove(itemId, oldentry, fn, errFn);
    }, errFn);
  };

  innerset.findOnce = function(filters) {
    //@TODO should check storeset also
    return cacheset.findOnce(filters);
  };

  innerset.find = function(filters) {
    //@TODO should check storeset also
    return cacheset.find(filters);
  };

  innerset.getInnerSet = function() {
    return cacheset;
  };

  return fullset;
}

/**
 * @author: tyip AT beedesk DOT com
 */
function RESTfulDataSet(conf) {

  var innerset = new BareSet($.extend({}, conf, {name: conf.name + "-inner"}));

  var instance = new SimpleDataSet($.extend(conf, {innerset: innerset}));

  // error check
  if (conf.baseurl === undefined) {
    console.error('Parameter "baseurl" is not specified.'); // fatal error
  }
  if (conf.entitytype=== undefined) {
    console.error('Parameter "entitytype" is not specified.'); // fatal error
  }

  var url = conf.baseurl + '/' + conf.entitytype;

  var normalize = conf.normalize || function(raw) { return raw; };

  var rectangular = function(data, fn) {
    var list = data.items;
    for (var j=0, len=list.length; j<len; j++) {
      var item = list[j];
      var id = conf.getId(item);
      fn(id, item);
    }
  };
  var idkeyed = function(data, fn) {
    var list = data.items;
    for (var id in list) {
      var item = list[id];
      fn(id, item);
    }
  }; 
  var idkeyedordered = function(data, fn) {
    for (var i=0, len=data.order.length; i<len; i++) {
      try {
        var id = data.order[i];
        var item = data.items[id];
        fn(id, item);
      } catch(e) {
        console.error('exception invoke: ' + e);
      }
    }
  };
  var itemize;
  if (!!conf.itemize) {
    if (Arguments.isNonNullFn(conf.itemize)) {
      itemize = conf.itemize;
    } else if (conf.itemize === "idkeyed") {
      itemize = idkeyed;
    } else if (conf.itemize === "idkeyedordred") {
      itemize = idkeyedordered;
    } else if (conf.itemize === "rectangular") {
      itemize = rectangular;
    }
  } else {
    itemize = idkeyed;
  }

  var ajaxBrowse = function(fn, errFn, sumFn, filters) {
    if (!fn) {
      console.error('Expect fn parameter.');
      throw 'Expect fn parameter.';
    }
    var searchString = HashSearch.getSearchString(filters) || '';
    var url = conf.baseurl + '/' + conf.entitytype + searchString;
    $.ajax({
      type: 'GET',
      url: url,
      dataType: 'json',
      beforeSend: function(xhr) {
        xhr.withCredentials = true;
      },
      success: function(raw) {
        var count = 0;
        try {
          var data = normalize(raw);
          itemize(data, function(id, item) {
            fn(id, item);
            count++;
          });
        } catch(e) {
          var exception = {datasetname: instance.name, message: e.message, url: url, method: "browse", status: "400", kind: "unknown"};
          exception.nested = {exception: e};
          errFn(exception);
        }
        sumFn(count);
      },
      error: function(request, textStatus, errorThrown) {
        sumFn(0);
        var exception = {datasetname: instance.name, status: request.status, message: request.statusText, url: url, method: "browse", kind: textStatus};
        exception.nested = {request: request, status: textStatus, exception: errorThrown};
        errFn(exception);
      },
      async: true
    });
  };

  var ajaxcommon = function(options, fn, err) {
    var ajaxoptions = $.extend({
        success: function(data) {
          $.extend(ajaxoptions.entity, data.entity);
          $.extend(ajaxoptions.oldentity, data.oldentity);
          fn(data);
        },
        error: function(request, textStatus, errorThrown) {
          var exception = {datasetname: instance.name, status: request.status, message: request.statusText, url: url, method: options.method, kind: textStatus};
          exception.nested = {request: request, status: textStatus, exception: errorThrown};
          err(exception);
        },
        dataType: 'json',
        beforeSend: function(xhr) {
          xhr.withCredentials = true;
        },
        async: true,
        entity: {},
        oldentity: {}
      }, options);

    if (ajaxoptions.entity != undefined) {
      delete ajaxoptions.entity;
    }
    if (ajaxoptions.oldentity != undefined) {
      delete ajaxoptions.oldentity;
    }
    $.ajax(ajaxoptions);
  };

  innerset.read = function(id, fn, errFn) {
    Arguments.assertNonNull(id, conf.name + ".read: expect argument 'id'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'GET', method: "read", url: url, data: JSON.stringify({}), entity: {}}, ajaxFn, errFn);
  };

  innerset.create = function(entity, fn, errFn) {
    Arguments.assertNonNull(entity, conf.name + "(RESTFulDataSet).create: expect argument 'entity'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/';
    var data = JSON.stringify({entity:entity, oldentity: entity});
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'POST', method: "create", url: url, data: data, entity: entity}, ajaxFn, errFn);
  };

  innerset.update = function(id, entity, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentity) && $.isFunction(oldentity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentity;
      oldentity = undefined;
    }

    Arguments.assertNonNull(id, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(entity, conf.name + ".update: expect argument 'newentry'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var data = JSON.stringify({entity:entity, oldentity: oldentity});
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'PUT', method: "update", url: url, data: data}, ajaxFn, errFn);
  };

  innerset.remove = function(id, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentity) && $.isFunction(oldentity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentity;
      oldentity = undefined;
    }
    Arguments.assertNonNull(id, conf.name + ".remove: invalid (null) input.");
    Arguments.warnNonNull(id, conf.name + ".remove: invalid (null) input.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var ajaxFn = function(data) {
      fn(id, data);
    };
    ajaxcommon({type: 'DELETE', method: "remove", url: url, data: JSON.stringify({oldentity: oldentity})}, ajaxFn, errFn);
  };

  innerset.browse = function(fn, errFn, sumFn, filter) {
    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    ajaxBrowse(fn, errFn, sumFn, filter);
  };

  return instance;
} // function RESTfulDataSet()

/**
 * Similar to RESTFulDataSet, but going thru JSONP
 *
 * @author: tyip AT beedesk DOT com
 */
function JSONPDataSet(conf) {

  var innerset = new BareSet($.extend({}, conf, {name: conf.name + "-inner"}));

  var instance = new SimpleDataSet($.extend(conf, {innerset: innerset}));

  // error check
  if (conf.baseurl === undefined) {
    console.error('Parameter "baseurl" is not specified.'); // fatal error
  }
  if (conf.entitytype=== undefined) {
    console.error('Parameter "entitytype" is not specified.'); // fatal error
  }

  var url = conf.baseurl + '/' + conf.entitytype;

  var normalize = conf.normalize || function(raw) { return raw; };

  var rectangular = function(data, fn) {
    var list = data.items;
    for (var j=0, len=list.length; j<len; j++) {
      var item = list[j];
      var id = conf.getId(item);
      fn(id, item);
    }
  };
  var idkeyed = function(data, fn) {
    var list = data.items;
    for (var id in list) {
      var item = list[id];
      fn(id, item);
    }
  }; 
  var idkeyedordered = function(data, fn) {
    for (var i=0, len=data.order.length; i<len; i++) {
      try {
        var id = data.order[i];
        var item = data.items[id];
        fn(id, item);
      } catch(e) {
        console.error('exception invoke: ' + e);
      }
    }
  };
  var itemize;
  if (!!conf.itemize) {
    if (Arguments.isNonNullFn(conf.itemize)) {
      itemize = conf.itemize;
    } else if (conf.itemize === "idkeyed") {
      itemize = idkeyed;
    } else if (conf.itemize === "idkeyedordred") {
      itemize = idkeyedordered;
    } else if (conf.itemize === "rectangular") {
      itemize = rectangular
    }
  } else {
    itemize = idkeyed;
  }

  var ajaxBrowse = function(fn, errFn, sumFn, filters) {
    if (!fn) {
      console.error('Expect fn parameter.');
      throw 'Expect fn parameter.';
    }
    var searchString = HashSearch.getSearchString(filters) || '';
    $.jsonp({
      type: "GET",
      url: url + "?callback=?&method=GET",
      dataType: "jsonp",
      success: function(raw) {
        var count = 0;
        try {
          var data = normalize(raw);
          itemize(data, function(id, item) {
            fn(id, item);
            count++;
          });
        } catch(e) {
          var exception = {datasetname: instance.name, message: e.message, url: url, method: "browse", status: "400", kind: "unknown"};
          exception.nested = {exception: e};
          errFn(exception);
        }
        sumFn(count);
      },
      error: function() {
        var exception = {datasetname: instance.name, status: "400", message: "jsonp does not give error detail", url: url, method: "browse", kind: "error"};
        sumFn(0);
        errFn(exception);
      },
      callback: "callback"
    });
  };

  var ajaxcommon = function(options, fn, err) {
    var ajaxoptions = $.extend({
      type: "GET",
      url: url + "?callback=?&method=GET",
      dataType: "jsonp",
      success: function(data) {
        $.extend(ajaxoptions.entity, data.entity);
        $.extend(ajaxoptions.oldentity, data.oldentity);
        fn(data);
      },
      error: function() {
        var exception = {datasetname: instance.name, status: "400", message: "jsonp does not give error detail", url: url, method: options.method, kind: "error"};
        err(exception);
      },
      entity: {},
      oldentity: {}
    }, options);

    if (ajaxoptions.entity != undefined) {
      delete ajaxoptions.entity;
    }
    if (ajaxoptions.oldentity != undefined) {
      delete ajaxoptions.oldentity;
    }
    $.ajax(ajaxoptions);
  };

  innerset.read = function(id, fn, errFn) {
    Arguments.assertNonNull(id, conf.name + ".read: expect argument 'id'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'GET', method: "read", url: url, data: JSON.stringify({}), entity: {}}, ajaxFn, errFn);
  };

  innerset.create = function(entity, fn, errFn) {
    Arguments.assertNonNull(entity, conf.name + "(JSONPDataSet).create: expect argument 'entity'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/';
    var data = JSON.stringify({entity:entity, oldentity: entity});
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'POST', method: "create", url: url, data: data, entity: entity}, ajaxFn, errFn);
  };

  innerset.update = function(id, entity, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentity) && $.isFunction(oldentity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentity;
      oldentity = undefined;
    }

    Arguments.assertNonNull(id, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(entity, conf.name + ".update: expect argument 'newentry'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var data = JSON.stringify({entity:entity, oldentity: oldentity});
    var ajaxFn = function(data) {
      var id = conf.getId(data);
      fn(id, data);
    };
    ajaxcommon({type: 'PUT', method: "update", url: url, data: data}, ajaxFn, errFn);
  };

  innerset.remove = function(id, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentity) && $.isFunction(oldentity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentity;
      oldentity = undefined;
    }
    Arguments.assertNonNull(id, conf.name + ".remove: invalid (null) input.");
    Arguments.warnNonNull(id, conf.name + ".remove: invalid (null) input.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var ajaxFn = function(data) {
      fn(id, data);
    };
    ajaxcommon({type: 'DELETE', method: "remove", url: url, data: JSON.stringify({oldentity: oldentity})}, ajaxFn, errFn);
  };

  innerset.browse = function(fn, errFn, sumFn, filter) {
    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    ajaxBrowse(fn, errFn, sumFn, filter);
  };

  return instance;
} // function JSONPDataSet

function AjaxDataSet(conf) {

  // error check
  if (conf.url === undefined) {
    console.error('Url is not specified.'); // fatal error
  }

  var myconf = $.extend({
    tokens: function(item) {
      return [item.id];
    },
    normalize: function(data) {
      return data;
    }
  }, conf);

  var entries = new SimpleDataSet(myconf);

  var oldinit = entries.init;
  entries.init = function() {
    oldinit();
  };

  var oldstart = entries.start;
  entries.start = function() {
    $.ajax({
      type: 'GET',
      url: myconf.url,
      dataType: 'json',
      success: function(data) {
        var raw = myconf.normalize(data);

        var list = raw.items;
        for (var j=0, len=list.length; j<len; j++) {
          var entry = list[j];
          entries.create(entry, function() {
            //entries.trigger('added', {entryId: entry.id, entry: entry});
          }, function() {
            console.error("some error adding item.");
          });
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        console.error("ajax error '" + XMLHttpRequest.status + "' ajax error '" + " url '" + myconf.url + "'. " + textStatus);
      },
      data: {},
      async: false
    });
    oldstart();
  };

  return entries;
}

function FilteredEntries(conf) {
  // @tyip: currently, it ignore what has already in upstream.
  // so, it is used in case where the Filtered is binded to
  // the unfilitered in the beginning.

  if (conf.upstream === undefined || conf.upstream === null) {
    console.error('expect upstream to be set.');
  }
  if (conf.match === null) {
    console.error('expect match fn to be set.');
  }

  var entries = new SimpleBareSet(conf);

  var self = new SimpleBinder({name: ((myconf? myconf.name? myconf.name + '.' :'':'') + 'event-handler')});

  var myconf = $.extend({
    entryIn: function(id, entry) {
      return id;
    },
    entryOut: function(id, entry) {
      var result;
      if (entry !== undefined && entry != null) {
        result = conf.upstream.read(id);
      } else {
        result = {id: id};
      }
      return result;
    },
    match: function(entry) {
      return true;
    },
    useRemovedAdded: false
  }, conf);

  var upstream = myconf.upstream;
  upstream.bind('added', function(event) {
    if (myconf.match(event.entry)) {
      entries.create(event.entry);

      self.trigger('added', event);
    }
  });
  upstream.bind('removed', function(event) {
    var existed = entries.read(event.entryId);
    if (existed !== undefined) {
      entries.remove(event.entryId);

      self.trigger('removed', event);
    }
  });
  upstream.bind('updated', function(event) {
    var existed = entries.read(event.entryId);
    if (existed !== undefined) {
      entries.update(event.entryId, event.entry);

      if (myconf.useRemovedAdded === true) {
        self.trigger('removed', event);
        self.trigger('added', event);
      } else {
        self.trigger('updated', event);
      }
    }
  });

  self.name = myconf.name;

  self.read = function(entryId, fn, errFn) { // "read into"
    var result;
    result = upstream.read.apply(this, arguments);
    return result;
  };
  self.create = function(entry, fn, errFn) {
    var result;
    result = upstream.create.apply(this, arguments);
    return result;
  };
  self.update = function(entryId, newentry, fn, errFn) {
    var result;
    result = upstream.update.apply(this, arguments);
    return result;
  };
  self.remove = function(entryId, oldentry, fn, errFn) {
    var result;
    result = upstream.remove.apply(this, arguments);
    return result;
  };
  self.removeAll = function() {
    var count;
    var selection = conf.upstream.find(conf.match);
    for (var i=0, len=selection.length; i < len; i++) {
      count++;
      var result = upstream.remove(selection[i]);
    }
    return count;
  };
  self.browse = function(fn, err, sumFn, filters) {
    return entries.browse(fn, err, sumFn, filters);
  };
  self.findOnce = function(filters) {
    var result = entries.findOnce(filters);
    return result;
  };
  self.find = function(filters) {
    var result = entries.find(filters);
    return result;
  };
  self.refresh = function() {
    var existing = [];
    entries.browse(Arrays.collect(existing));
    var selection = conf.upstream.find(conf.match).sort();
    var result = Arrays.intersect(existing, selection, true);
    //console.error('left: ' + uneval(result.left) + ' middle: ' + uneval(result.middle)+ ' right: ' + uneval(result.right));
    for (var i=0, len=result.left.length; i < len; i++) {
      var id = result.left[i];
      var entry = conf.upstream.read(id);
      entries.remove(id);
      this.trigger('removed', {entryId: id, entry: entry});
    }
    result.right.reverse();
    for (var i=0, len=result.right.length; i < len; i++) {
      var id = result.right[i];
      var entry = conf.upstream.read(id);
      entries.create(entry);
      this.trigger('added', {entryId: id, entry: entry});
    }
  };

  return self;
}

function SelectedEntries(conf) {

  var selected;
  var filtered = {};

  if (conf.upstream === undefined || conf.upstream === null) {
    console.error('expect upstream to be set.');
  }
  if (conf.match !== undefined) {
    console.error('match fn will be overriden.');
  }

  var entries = new FilteredEntries($.extend(conf, {
    match: function(entry) {
      var result = false;
      if (selected !== undefined && selected !== null) {
        if (entry.id === selected) {
          result = true;
        } else {
          var contained = conf.upstream.find({container: selected});
          for (var j=0, len=contained.length; j<len; j++) {
            if (contained[j] === entry.id) {
              result = true;
              break;
            }
          }

          if (!result) {
            var selectedEntry = conf.upstream.read(selected);
            var children = selectedEntry.children;
            for (var child in children) {
              if (child === entry.id) {
                result = true;
                break;
              }
            }
          }
        }
      }
      return result;
    }
  }));
  entries.setSelected = function(id) {
    selected = id;
    entries.refresh();
  };
  entries.getSelected = function() {
    return selected;
  };

  return entries;
};

function DatabaseDesc(conf) {
  conf = $.extend(conf, {
    version: "0.1",
    desc: "My HTML5 DB",
    maxsize: 5000000
  });

  // error check
  if (conf.name === undefined) {
    throw('Parameter for database "name" is not specified.'); // fatal error
  }

  var db = null;
  conf.open = function() {
    try {
      if (db === null) {
        db = openDatabase(conf.name, conf.version, conf.desc, conf.size);
      }
      return db;
    } catch (error) {
      console.error('Could no open database, "' + conf.name + '". Please make sure your iPhone has iOS 4.0+, or up-to-date browser.');
    }
  };

  conf.renew = function() {
    if (db !== null) {
      // anyway to close it?
    }
    db = null;
  };
  return conf;
};

function EntityDesc(conf) {
  // error check
  if (!conf) {
    throw('Parameter for entity is not specified.'); // fatal error
  }
  if (!conf.db) {
    throw('Parameter for entity "db" is not specified.'); // fatal error
  }
  if (!conf.name) {
    throw('Parameter for entity "name" is not specified.'); // fatal error
  }
  if (!conf.id) {
    throw('Parameter for entity "id" is not specified.'); // fatal error
  }
  if (!conf.fields) {
    throw('Parameter for entity "fields" is not specified.'); // fatal error
  }
  var assertField = function(field) {
    if (!field || !field.name) {
      throw('Parameter [key] in "fields" is empty.');
    }
    if (!field.type) {
      throw('Nested parameter for entity "field[n].type" is not specified.');
    }
  };
  assertField(conf.id);
  Arrays.apply(assertField, conf.fields);

  // take in default value
  conf = $.extend(conf, {
    autocreate: true,
    keygen: false
  });

  return conf;
}

function DatabaseDataSet(conf) {
  if (!conf.entity) {
    throw('Parameter "entity" is not specified.'); // fatal error
  }
  if (!conf.entity.db) {
    throw('Parameter "entity.db" is not specified.'); // fatal error
  }

  var instance = this;

  conf = $.extend(conf, {
    errorhandler: null
  });

  var errorHandler = new SimpleBinder({
    name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')
  });

  var processError = !!conf.errorhandler? conf.errorhandler: new function() {};

  // main
  var entity = conf.entity;
  var db = entity.db.open();

  var getName = function(item) {
    return item.name;
  };

  var namequote = Strings.mysqlquote;

  var idfield = entity.id.name;
  var colfields = Arrays.apply(getName, entity.fields);

  var dbname = entity.db.name;
  var entityname = entity.name;

  var fieldAndType = function(field) {
    return namequote(field.name) + ' ' + field.type;
  };

  var verifyTable = function() {
    db.transaction(function(tx) {
      tx.executeSql("SELECT COUNT(*) FROM " + entityname, [],
        function(result) {
          console.warn("LocalDB table '" + entityname + "' found.");
        },
        function(tx, error) {
          if (entity.autocreate) {
            var idstring = fieldAndType(entity.id) + ' PRIMARY KEY' + (entity.keygen === 'seq'? ' AUTO INCREMENT' : '');
            var fieldstring = Arrays.apply(fieldAndType, entity.fields);
            var sql = "CREATE TABLE " + namequote(entityname)
            + " ( " + idstring + ", " + fieldstring + " )";
            console.log('create table: ' + sql);
            tx.executeSql(sql, [],
              function(result) {}
            );
          } else {
            throw('Table "' + entity.name + '" does not exist and autocreate option is off.');
          }
        }
      );
    });
  };

  var innerset = new BareSet($.extend({}, conf, {name: conf.name + "-inner"}));

  var instance = new SimpleDataSet($.extend(conf, {innerset: innerset}));

  var url = "localdb://" + conf.entity.db.name + "/" + conf.entity.name + "/";

  innerset.browse = function(fn, errFn, sumFn, filter) {
    // adjust argument
    if (!Arguments.isNonNullFn(sumFn)) {
      filter = sumFn;
      sumFn = null;
    }

    sumFn = sumFn || function() {};

    var cont;
    var idstring = namequote(idfield);
    var fieldstring = Strings.join(', ', Arrays.apply(namequote, colfields));
    var conds = [];
    var sorts = [];
    var limit = [];
    var values = [];
    if (Hashs.has(filter, 'namedquery')) {
      switch(filter.namedquery) {
      case 'last-modified':
        console.log('named query: last-modified');
        sorts.push('modified');
        limit = [0, 1];
        break;
      default:
        break;
      }
    }
    db.transaction(function(tx) {
      var sql = "SELECT " + idstring + ", " + fieldstring
      + " FROM " + namequote(entityname)
      + (sorts.length == 0? "": " ORDER BY " + Strings.join(", ", Arrays.apply(namequote, sorts)) + " DESC ")
      + (limit.length != 2? "": " LIMIT " + limit[0] + ", " + limit[1]);
      console.log('sql: ' + sql);
      tx.executeSql(sql, values,
        function(tx, resultset) {
          for (var i = 0; i < resultset.rows.length; ++i) {
            var row = resultset.rows.item(i);
            cont = fn(row[idfield], row);
            if (cont === false)
              break;
          }
          sumFn(resultset.rows.length);
        }, function(tx, error) {
          var message = typeof(error) === "string"? error: JSON.stringify(error);
          var exception = {datasetname: instance.name, status: "400", message: message, url: url, method: "browse", kind: "error"};
          exception.nested = error;
          errFn(exception);
          sumFn(0);
        }
      );
    });
    return cont;
  };

  innerset.create = function(entity, fn, errFn) {
    Arguments.assertNonNull(entity, conf.name + '.create: expect entity.');
    Arguments.warnNonNull(fn, conf.name + '.create: expect fn.');

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    db.transaction(function(tx) {
      var effectiveFields;
      if (conf.keygen) {
        effectiveFields = colfields;
      } else {
        effectiveFields = [];
        effectiveFields.push(idfield);
        effectiveFields = effectiveFields.concat(colfields);
      }
      var values = Arrays.extract(effectiveFields, entity);
      var id = entity[idfield];
      var sql = "INSERT INTO " + namequote(entityname) + " ( " + Strings.join(", ", Arrays.apply(namequote, effectiveFields))
          + " ) VALUES ( " + Strings.join(', ', Strings.fill('?', (effectiveFields.length))) + " )";
      tx.executeSql(sql, values, function(result) {
        fn(id, entity);
      }, function(tx, error) {
        var message = typeof(error) === "string"? error: JSON.stringify(error);
        var exception = {datasetname: instance.name, status: "400", message: message, url: url, method: "create", kind: "error"};
        exception.nested = error;
        errFn(exception);
      });
    });
  };

  innerset.read = function(id, fn, errFn) {
    Arguments.assertNonNull(id, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = CRUDs.getCheckedErrorFn(errFn);

    var effectiveFields = [];
    effectiveFields.push(idfield);
    effectiveFields = effectiveFields.concat(colfields);

    var values = [];
    values.push(id);

    var sql = "SELECT " + Strings.join(", ", Arrays.apply(namequote, effectiveFields)) + " FROM " + namequote(entityname)
    + " WHERE " + namequote(idfield) + "=?";

    db.transaction(function(tx) {
      tx.executeSql(sql, values, function(tx, resultset) {
        if (resultset.rows.length > 0) {
          row = resultset.rows.item(0);
          fn(id, row);
          //console.log('result: ' + uneval(row));
        } else {
          errFn(id, 'no row for id: ' + id);
        }
      }, function(tx, error) {
        var message = typeof(error) === "string"? error: JSON.stringify(error);
        var exception = {datasetname: instance.name, status: "400", message: message, url: url, method: "create", kind: "error"};
        exception.nested = error;
        errFn(exception);
      });
    });
  };

  innerset.update = function(id, entity, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(entity) && $.isFunction(entity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = entity;
      entity = undefined;
    }

    Arguments.assertNonNull(entity, conf.name + ".update: expect argument 'entity'.");
    Arguments.warnNonNull(fn, conf.name + ".update: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    errFn("not implemented.");
    throw('not implemented');
  };

  innerset.remove = function(id, entity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(entity) && $.isFunction(entity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = entity;
      entity = undefined;
    }

    Arguments.assertNonNull(id, conf.name + ".remove: expect argument 'id'.");
    Arguments.warnNonNull(fn, conf.name + ".remove: expect argument 'fn'.");

    fn = CRUDs.getCheckedFn(fn);
    errFn = CRUDs.getCheckedErrorFn(errFn);

    db.transaction(function(tx) {
      var values = [];
      values.push(id);
      var sql = "DELETE FROM " + namequote(entityname) + " WHERE " + namequote(idfield) + "=?";
      console.log('sql: ' + sql + ' id: ' + uneval(idfield) + ' values: ' + uneval(values));
      tx.executeSql(sql, values, function(result) {
        fn(values[0], null); //@TODO
      }, function(tx, error) {
        var message = typeof(error) === "string"? error: JSON.stringify(error);
        var exception = {datasetname: instance.name, status: "400", message: message, url: url, method: "create", kind: "error"};
        exception.nested = error;
        errFn(exception);
      });
    });
  };

  innerset.init = function() {
    verifyTable();
  };

  return instance;
};
