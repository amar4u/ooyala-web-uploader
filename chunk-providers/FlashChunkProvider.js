Ooyala.Client.FlashChunkProvider = function(browseButton, options){
  Ooyala.Client.EventDispatcher.call(this);
  options = options || {}
  if(typeof(browseButton) == "string"){
    browseButton = document.getElementById(browseButton);
  }

  this.browseButton = browseButton;
  this._init();

  this.defaults = {
    swfobjectURL: 'swfobject.js',
    slicingSWFURL: 'FlashFileSlicer.swf'
  };

  this.options = $.extend(options, this.defaults);
};

$.extend(Ooyala.Client.FlashChunkProvider.prototype, new Ooyala.Client.EventDispatcher, {
  _init: function(){
    var that = this;
    if(window.swfobject){
      this._onSWFObjectReady();
    }
    else{
      $.getScript(this.swfobjectURL, function(){that._onSWFObjectReady();});
    }
  },

  _onSWFObjectReady: function(){
    var swfVersionStr = "10.2.0";
    To use express install, set to playerProductInstall.swf, otherwise the empty string. 
    var xiSwfUrlStr = "";
    var flashvars = {};
    flashvars.buttonLabel = $(this.browseButton).text();
    flashvars.buttonWidth = this.browseButton.offsetWidth;
    flashvars.buttonHeight = this.browseButton.offsetHeight;
    var params = {};
    params.quality = "high";
    params.bgcolor = "#ffffff";
    params.allowscriptaccess = "sameDomain";
    params.allowfullscreen = "true";
    var attributes = {};
    attributes.id = "flashChunkProvider";
    attributes.name = "flashChunkProvider";
    attributes.align = "middle";
    swfobject.embedSWF(
      this.options.slicingSWFURL, this.browseButton.id, 
      this.browseButton.offsetWidth, this.browseButton.offsetHeight, 
      swfVersionStr, xiSwfUrlStr, 
    flashvars, params, attributes);

    // JavaScript enabled so display the flashContent div in case it is not replaced with a swf object.
    swfobject.createCSS("#" + this.browseButton.id, "display:block;text-align:left;");
  }
});
