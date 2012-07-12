/**
* Base class for Uploaders
* */
Ooyala.Client.Uploader = function(){
  var that = Object.create(new Ooyala.Client.EventDispatcher())

  that.getFile = function(){
    return null;
  };

  that.upload = function(){
    throw new Error("This method should be implemented by a child object");
  };

  that.progress = function(){
    return 0;
  };

  return that;
};
