/**
 * Bootstrap the Ooyala namespace and provide the implenentation for the Object.create function 
 * by Douglas Crockford to browsers that do not implement ECMAScript 5
 * */
if(!window.Ooyala){
  window.Ooyala = {};
}

Ooyala.Client = {} || Ooyala.Client;

if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}
