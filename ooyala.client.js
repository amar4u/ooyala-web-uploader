/**
 * Bootstrap the Ooyala.Client namespace and provide the implementation for the Object.create and 
 * Object.defineProperties functions to browsers that do not implement ECMAScript 5
 * */

if(!window.Ooyala){
  window.Ooyala = {};
}

Ooyala.Client = {} || Ooyala.Client;

if(typeof Object.defineProperties !== 'function'){
  Object.defineProperties = function(obj, properties){
    for(var key in properties){
      obj[key] = properties[key];
    }
  };
}

if(typeof Object.create !== 'function'){
  Object.create = function(proto, propertiesObj){
    function F(){};
    F.prototype = proto;
    if(typeof propertiesObj !== 'undefined'){
      Object.defineProperties(F, propertiesObj);
    }
    return new F();
  };
}
