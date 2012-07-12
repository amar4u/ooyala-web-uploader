/**
* Base class to all Objects that will support the "on('event', callback)" pattern for event listening
* */
Ooyala.Client.EventDispatcher = function(){
  var eventHandlers = {};

  var that = Object.create(Object.prototype);

  that.on = function(eventName, eventHandler, context){
    if(!eventHandlers[eventName]){                                            
      eventHandlers[eventName] = [];                                          
    }                                                                              

    context = context || this;                                                     

    eventHandlers[eventName].push({handler: eventHandler, context: context}); 
  };

  that.dispatchEvent = function(eventName){
    var handlers = eventHandlers[eventName];   

    if(!handlers){                                  
      return;                                       
    }                                               

    var size = handlers.length;                     

    for(var i = 0; i < size; i++){                  
      var h = handlers[i];                          
      if(args){                                     
        h.handler.apply(h.context, args);           
      }                                             
      else{                                         
        h.handler.call(h.context);                  
      }                                             
    }                                             
  };

  return that;
};
