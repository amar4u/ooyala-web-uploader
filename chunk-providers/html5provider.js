(function(){
  Ooyala.Client.HTML5ChunkProvider = function(file){
    this.file = file;
    this.data = "";
  };

  $.extend(Ooyala.Client.HTML5ChunkProvider.prototype, new Ooyala.Client.EventDispatcher(), {
    getChunk: function(startByte, endByte){
      if(!this.file){
        throw new Error("No file has been selected yet.");
      }
      var that = this;
      var sliceFunctionName = (this.file.mozSlice ? 'mozSlice' : 'slice');

      this.data = this.file[sliceFunctionName](startByte, endByte);
      this.dispatchEvent("complete");
    }
  });
}).call(this);
