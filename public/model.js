(function() {  
  // copy and modified from cacheca.js::RESTfulDataSet(conf)
  function CouchDBDataSet(conf) {
    
    var myconf = $.extend({
      eagarbrowse: true
    }, conf);

    var rev = '';
    var data = {};

    var innerset = new BareSet($.extend({}, myconf, {name: myconf.name + "-inner"}));

    var instance = new SimpleDataSet($.extend(myconf, {
      innerset: innerset,
      isBrowseFilterSupported: false
    }));

    // error check
    if (myconf.baseurl === undefined) {
      console.error('Parameter "baseurl" is not specified.'); // fatal error
    }
    if (myconf.entitytype=== undefined) {
      console.error('Parameter "entitytype" is not specified.'); // fatal error
    }

    var url = myconf.baseurl + '/' + myconf.entitytype;

    var normalize = myconf.normalize || function(raw) { return raw; };

    var rectangular = function(data, fn) {
      var list = data.items;
      for (var j=0, len=list.length; j<len; j++) {
        var item = list[j];
        var id = myconf.getId(item);
        if (fn(id, item) === false) {
          break;
        }
      }
    };
    var idkeyed = function(data, fn) {
      var list = data.items;
      for (var id in list) {
        var item = list[id];
        if (fn(id, item) === false) {
          break;
        }
      }
    }; 
    var idkeyedordered = function(data, fn) {
      for (var i=0, len=data.order.length; i<len; i++) {
        try {
          var id = data.order[i];
          var item = data.items[id];
          if (fn(id, item) === false) {
            break;
          }
        } catch(e) {
          console.error('exception invoke: ' + e);
        }
      }
    };
    var itemize;
    if (!!myconf.itemize) {
      if (Arguments.isNonNullFn(myconf.itemize)) {
        itemize = myconf.itemize;
      } else if (myconf.itemize === "idkeyed") {
        itemize = idkeyed;
      } else if (myconf.itemize === "idkeyedordred") {
        itemize = idkeyedordered;
      } else if (myconf.itemize === "rectangular") {
        itemize = rectangular;
      }
    } else {
      itemize = idkeyed;
    }

    innerset.read = function(id, fn, errFn) {
      if (data.items !== undefined && data.items !== null) { 
        fn(id, data.items[id]);
      } else {
        errFn();
      }
    };

    innerset.create = function(entity, fn, errFn) {
      var id = guid();

      var url = myconf.baseurl + "/" + myconf.docname + "/" + encodeURIComponent(rev);
      if (!!rev) {
        data._rev = rev;
      }
      if (data.items === null || data.items === undefined) {
        data.items = {};
      }
      data.items[id] = entity;

      $.ajax({
        type: 'PUT',
        url: url,
        data: JSON.stringify(data),
        dataType: 'json',
        beforeSend: function(xhr) {},
        success: function(data) {
          rev = data.rev;
          fn(id, entity);
        },
        error: function(request, textStatus, errorThrown) {
          // err
          var exception = {datasetname: 'aspen', status: request.status, message: request.statusText, url: url, method: "update", kind: textStatus};
          errFn(exception);
        }
      });      
    };

    innerset.update = function(id, entity, oldentity, fn, errFn) {
      var url = myconf.baseurl + "/" + myconf.docname + "/" + encodeURIComponent(rev);
      if (!!rev) {
        data._rev = rev;
      }
      
      if (id in data.items) {
        var item = data.items[id];
        delete data.items[id];
        data.items[id] = entity;
        $.ajax({
          type: 'PUT',
          url: url,
          data: JSON.stringify(data),
          dataType: 'json',
          beforeSend: function(xhr) {},
          success: function(data) {
            rev = data.rev;
            fn(id, item);
          },
          error: function(request, textStatus, errorThrown) {
            // err
            var exception = {datasetname: 'aspen', status: request.status, message: request.statusText, url: url, method: "update", kind: textStatus};
            errFn(exception);
          }
        });
      } else {
        errFn({datasetname: 'aspen', status: '404', message: 'Not Found!', url: url, method: "delete", kind: "error"});
      }
    };

    innerset.remove = function(id, oldentity, fn, errFn) {
      var url = myconf.baseurl + "/" + myconf.docname + "/" + encodeURIComponent(rev);
      if (!!rev) {
        data._rev = rev;
      }

      if (id in data.items) {
        var item = data.items[id];
        delete data.items[id];
        $.ajax({
          type: 'PUT',
          url: url,
          data: JSON.stringify(data),
          dataType: 'json',
          beforeSend: function(xhr) {},
          success: function(data) {
            rev = data.rev;
            fn(id, item);
          },
          error: function(request, textStatus, errorThrown) {
            // err
            var exception = {datasetname: 'aspen', status: request.status, message: request.statusText, url: url, method: "update", kind: textStatus};
            errFn(exception);
          }
        });
      } else {
        errFn({datasetname: 'aspen', status: '404', message: 'Not Found!', url: url, method: "delete", kind: "error"});
      }
    };

    innerset.browse = function(fn, errFn, sumFn, filter) {
      var url = myconf.baseurl + "/" + myconf.docname;
      $.ajax({
        type: 'GET',
        url: url,
        dataType: 'json',
        beforeSend: function(xhr) {},
        async: true,
        success: function(raw) {
          var count = 0;
          rev = raw._rev;
          // {items: {id2: item2, id2: items2}, orders: [id1, id2]}
          raw = normalize(raw);
          var newdata = {items: {}};
          itemize(raw, function(id, item) {
            newdata.items[id] = item;
            count++;
            return fn(id, item);
          });
          data = newdata;
          sumFn(count);
        },
        error: function(request, textStatus, errorThrown) {
          // err
          var exception = {datasetname: 'aspen', status: request.status, message: request.statusText, url: url, method: "read", kind: textStatus};
          if (exception.status === 404 || exception.status == '404') {
            console.warn("data set is empty");
          } else {
            console.error("read problem. " + JSON.stringify(exception));
          }
        }
      });
    };

    return instance;
  }
  
  model = {CouchDBDataSet: CouchDBDataSet};
}());
