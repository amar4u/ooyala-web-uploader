(function($){

  /**
   * Pieces of code taken from resumable.js at https://github.com/23/resumable.js
   * */

  /**
   * Detect if the browser has support for the File API calls we need.
   * @private
   * */
  var isFileAPISuppported = function(){
    return typeof File !== "undefined" && (File.prototype.mozSlice || File.prototype.webkitSlice);
  };


  var UploadableChunk = function(url, chunkProvider, maxNumberOfRetries){
    Ooyala.Client.EventDispatcher.call(this);
    this.url = url;
    this.chunkProvider = chunkProvider;
    this.maxNumberOfRetries = maxNumberOfRetries;
    this.retriesSoFar = 0;
  };

  $.extend(UploadableChunk.prototype, new Ooyala.Client.EventDispatcher(), {
    upload: function(error){
      //Dumb retries. We don't care about the underlying error, we just try again until we hit the retries limit.
      if(this.retriesSoFar > this.numberOfRetries){
        this.dispatchEvent("error", [error]);
      }
      else{
        this.retriesSoFar++;
        this.transferBytesOverTheWire();
      }
    },

    /**
     * This function does the heavy lifting of sending the bytes over to the uploading endpoint.
     * @private
     * */
    transferBytesOverTheWire: function(){
      var matchResults = this.url.match(/.+\/(.+)-([^&]+)/);
      var startByte = parseInt(matchResults[1], 10);
      var endByte = parseInt(matchResults[2], 10) + 1;
      var numberOfBytes = endByte - startByte + 1;
      var that = this;

      var onComplete = function(){
        that.chunkProvider.detach("complete");
        var bytes = that.chunkProvider.data;

        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function(){that.dispatchEvent("complete");});
        xhr.addEventListener("error", function(e){that.upload(e);}); //Retry

        xhr.open("POST", that.url);

        if(window.Blob){
          var data = new FormData();
          data.append("chunk", bytes);
          xhr.send(data);
        }
        else{

          var boundary = "--------------------------" + Math.random().toString().replace("0.","");

          var body = "--" + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\n' + bytes + "\r\n--" + boundary + "--\r\n";

          xhr.setRequestHeader("content-type", "multipart/form-data; charset=x-user-defined-binary; boundary=" + boundary);
          
          xhr.send(body);
        }
      };

      this.chunkProvider.on("complete", onComplete);

      this.chunkProvider.getChunk(startByte, endByte);
    }
  });

  /**
   * HTMLUploader Object to interact with either the HTML5 File API if available or fallback 
   * to Flash file slicing and doing a chunked upload via HTTP.
   * */
  var HTMLUploader = Ooyala.Client.HTMLUploader = function(browseButton, options){
    Ooyala.Client.Uploader.call(this);
    this.chunksUploaded = 0;
    this.chunkProvider = null;
    this.totalChunks = this.uploadingURLs.lenght;
    this.currentChunks = [];
    this.shouldStopBecauseOfError = false;
    this.browseButton = browseButton;
    this.chunkSize = 1*1024*1024;

    var defaults = {
      maxChunkRetries: 3,
      maxNumberOfConcurrnetChunks: 1
    };

    this.options = $.extend(defaults, options);

    if(isFileAPISuppported()){
      this.chunkProvider = new Ooyala.Client.HTML5ChunkProvider(this.file, this.browseButton);
    }
    else{
      this.chunkProvider = new Ooyala.Client.FlashChunkProvider();
    }

    var that = this;
    this.chunkProvider.on("fileSelected", function(){
      that.file = that.chunkProvider.file;
    });
  };

  $.extend(Ooyala.Client.HTMLUploader.prototype, new Ooyala.Client.Uploader, {
    /**
     * Start uploading the selected file.
     * */
    upload: function(){
      for(var i = 0; i < this.options.maxNumberOfConcurrnetChunks; i++){
        this.uploadNextChunk();
      }
    },

    /**
     * Upload the next chunk fetch from either the HTML5 or Flash chunk providers
     * */
    uploadNextChunk: function(){
      var that = this;
      var urlToUpload = this.uploadingURLs.pop();

      this.dispatchEvent("progress");

      //Stop if we are done uploading chunks and dispatch complete event.
      if(!urlToUpload){
        this.dispatchEvent("complete");
        return;
      }
      
      //Stop if there has been an error trying to upload a chunk.
      if(this.shouldStopBecauseOfError){
        return;
      }

      if(isFileAPISuppported()){
        var chunkProvider = new Ooyala.Client.HTML5ChunkProvider(this.file, this.browseButton);
      }
      else{
        var chunkProvider = new Ooyala.Client.FlashChunkProvider();
      }

      var uploadableChunk = new UploadableChunk(urlToUpload, chunkProvider, that.options.maxChunkRetries);
      //Upload the next chunk if this one has completed uploading
      uploadableChunk.on("complete", function(){that.chunksUploaded++; that.uploadNextChunk();});

      //If an error is thrown by one of the chunks, 
      //set the flag to stop the ingestion.
      uploadableChunk.on("error", function(e){
        that.dispatchEvent("error", [e]);
        that.shouldStopBecauseOfError = true;
      });

      uploadableChunk.upload();

    },

    progress: function(){
      return this.chunksUploaded == 0 ? 0 : (this.chunksUploaded / this.totalChunks);
    }
  });
}).call(this, jQuery);
