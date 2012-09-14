Ooyala.Client.FlashChunkProvider = function(browseButton, options){
  Ooyala.Client.EventDispatcher.call(this);
  options = options || {}
  if(typeof(browseButton) == "string"){
    browseButton = document.getElementById(browseButton);
  }

  this.browseButton = browseButton;

  this.defaults = {
    swfobjectURL: 'javascripts/swfobject.js',
    slicingSWFURL: 'javascripts/chunk-providers/flash-file-slicer/bin-debug/FlashFileSlicer.swf'
  };

  this._init();
  this.options = $.extend(options, this.defaults);
};

$.extend(Ooyala.Client.FlashChunkProvider.prototype, new Ooyala.Client.EventDispatcher, {
  _init: function(){
    var that = this;
    if(window.swfobject){
      this._onSWFObjectReady();
    }
    else{
      $.getScript(this.defaults.swfobjectURL, function(){that._onSWFObjectReady();});
    }
  },


  _onSWFObjectReady: function(){
    var swfVersionStr = "10.2.0";
    var xiSwfUrlStr = "";
    var flashvars = {};
    // Add 20% horizontal padding to prevent the flash tooltip always showing
    var paddedButtonWidth = this.browseButton.offsetWidth * 1.2;

    flashvars.buttonLabel = $(this.browseButton).text();
    flashvars.buttonWidth = paddedButtonWidth;
    flashvars.buttonHeight = this.browseButton.offsetHeight;
    flashvars.chunkProviderId = "flashChunkProvider"; 
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
     paddedButtonWidth, this.browseButton.offsetHeight, 
      swfVersionStr, xiSwfUrlStr, 
    flashvars, params, attributes
    );
    that = this;

    // JavaScript enabled so display the flashContent div in case it is not replaced with a swf object.
    swfobject.createCSS("#" + this.browseButton.id, "display:block;text-align:left;");
  },

  _flashFileSelected: function () {
       this.dispatchEvent("fileSelected");
  },
  getChunk: function (startByte, endByte) {
   document.getElementById("flashChunkProvider").getChunk(startByte, endByte, 'function(data) {that.data =Base64.decode(data); that.dispatchEvent("complete");}'
   );
  }
});
