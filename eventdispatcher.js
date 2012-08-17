/**
* Base class to all Objects that will support the "on('event', callback)" pattern for event listening
* */

(function($){
  Ooyala.Client.EventDispatcher = function(){
    this.eventHandlers = {};
  };

  $.extend(Ooyala.Client.EventDispatcher.prototype, {
    on: function(eventName, eventHandler, context){
      if(!this.eventHandlers[eventName]){
        this.eventHandlers[eventName] = [];
      }

      context = context || this;
      this.eventHandlers[eventName].push({handler: eventHandler, context: context});
    },

    detach: function(eventName, eventHandler){
      var handlers = this.eventHandlers[eventName];

      if(!handlers) return;

      var size = handlers.length;
      var indexToRemove = null;
      for(var i = 0; i < size; i++){
        if(handlers[i].handler === eventHandler){
          indexToRemove = i;
          break;
        }
      }

      //Get rid of the desired handler
      if(indexToRemove != null){
        this.eventHandlers[eventName].splice(indexToRemove,1);
      }
    },

    dispatchEvent: function(eventName, args){
      var handlers = this.eventHandlers[eventName];

      if(!handlers) return;

      var size = handlers.length;
      for(var i = 0; i < size; i++){
        var h = handlers[i];
        //Could happen when an event is trying to be dispatched and the handlers has been removed.
        if(!h) continue;
        if(args){
          h.handler.apply(h.context, args);
        }
        else{
          h.handler.call(h.context);
        }
      }
    }
  });
}).call(this, jQuery);
