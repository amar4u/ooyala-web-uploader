/**
 * Bootstrap the Ooyala.Client namespace.
 * */

if(!window.Ooyala){
  window.Ooyala = {};
}

Ooyala.Client = {} || Ooyala.Client;


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

(function($){

  Ooyala.Client.Events = {};

  Ooyala.Client.Events.PROGRESS = "progress";
  Ooyala.Client.Events.COMPLETE = "complete";
  Ooyala.Client.Events.ERROR = "error";
  Ooyala.Client.Events.FILE_SELECTED = "fileSelected";
  Ooyala.Client.Events.ASSET_CREATION_COMPLETE = "assetCreationComplete";

  /**
   * Upload assets to Ooyala using the chunked upload API.
   *
   * @param endpoint
   *   The absolute URL to the endpoint the API we use to prepare an upload
   *   and notify when an upload is complete.
   * @param browseButton
   *   The ID or DOM object of the button used to trigger browsing for an
   *   asset to upload.
   * @param dropArea
   *   The DOM object of an area to use for Drag and Drop uploads of assets.
   * @param options
   *   An optional object of options to use when instantiating the uploader
   *   with the following properties:
   *   - useAspera: Set to TRUE to use the Aspera Uploader. Currently
   *     unimplemented.
   *   - postProcessingStatus: Set the post processing options for the asset.
   *     Currently unimplemented.
   */
  Ooyala.Client.AssetCreator = function(endpoint, browseButton, dropArea, options){
    Ooyala.Client.EventDispatcher.call(this);
    if(typeof(jQuery) == "undefined"){
      throw new Error("This uploader needs jQuery 1.5+ to be loaded.");
    }
    if(typeof(JSON) == "undefined"){
      throw new Error("This uploader depend's on Douglas Crockford's JSON parser (https://github.com/douglascrockford/JSON-js) " +
                      "or one of the following browsers: Internet Explorer 8+, Firefox 3.1+, Safari 4+, Chrome 3+, and Opera 10.5+.");
    }
    if(!endpoint){
      throw new Error("Please provide an endpoint URL.");
    }
    if(!browseButton && !dropArea){
      throw new Error("You need to provide either a button element to fire the file browsing action or a file drop area element.");
    }

    if(typeof browseButton === "string"){
      browseButton = document.getElementById(browseButton);
    }

    this.browseButton = browseButton;
    this.dropArea = dropArea;
    this.endpoint = endpoint;
    this.eventHandlers = {};
    this.options = options || {};
    this.eventNames = Ooyala.Client.Events;

    this.uploader = null;

    if(this.options.useAspera){
      //TODO: Implement Aspera Uploader and plug it in here.
    }
    else{//Default back to the HTML Uploader
      this.uploader = new Ooyala.Client.HTMLUploader(browseButton, options);
    }

    var that = this;

    this.uploader.on(this.eventNames.PROGRESS, function(){that.progressHandler();});
    this.uploader.on(this.eventNames.COMPLETE, function(){that.uploadCompleteHandler();});
    this.uploader.on(this.eventNames.ERROR, function(){that.errorHandler();});
    this.uploader.on(this.eventNames.FILE_SELECTED, function(){that.fileSelectedHandler();});

    if(this.browseButton){
      this.uploader.assignBrowse(this.browseButton);
    }

    this.assetToUpload = null;
    this.embedCode = "";
    this.__asyncOperationsControl = [];
  };

  $.extend(Ooyala.Client.AssetCreator.prototype, new Ooyala.Client.EventDispatcher, {
    /**
     * Handler for when a file has been selected with the browseButton.
     */
    fileSelectedHandler: function() {
      this.dispatchEvent(this.eventNames.FILE_SELECTED);
    },

    /**
     * Prepare to upload an Ooyala asset.
     *
     * This method will validate the information provided by the user (such as
     * ensuring that they selected a file) and if everything passes reserve an
     * embed code with the Ooyala backlot. The event fired from sucessfully
     * creating the embed code will trigger the actual upload of the asset.
     *
     * @param name
     *   The name of the asset to create.
     * @param description
     *   The short text description of the asset.
     */
    prepareUpload: function(name, description){
      var that = this;

      //Dispatch error event if the user has not selected a file
      if(!this.uploader.file){
        this._errorHandler("The user has not selected a file.");
        return;
      }

      var fileToUpload = this.uploader.file;

      this.assetToUpload = {
        name: name,
        description: description,
      };

      //Take into consideration the Post Processing Status option if present
      if(this.options.postProcessingStatus){
        body.postProcessingStatus = this.options.postProcessingStatus;
      }

      // Send the asset creation call to the API Proxy and fire the
      // corresponding events.
      this.createAsset(this.assetToUpload.name, this.assetToUpload.description, fileToUpload.name, fileToUpload.size, this.uploader.chunkSize);
    },

    upload: function(){
      var that = this;

      //If we don't have an embed code, it means that the asset has not been created.
      //Fire an error event in that case.
      if(!this.embedCode){
        this.dispatchEvent(this.eventNames.ERROR, ["An asset has not been created."]);
        return;
      }

      that.uploader.upload();
    },

    progress: function(){
      return this.uploader ? this.uploader.progress() : 0;
    },

    progressHandler: function(){
      this.dispatchEvent(this.eventNames.PROGRESS);
    },

    uploadCompleteHandler: function(){
      var that = this;

      //Update the uploading_status of the asset via the API Proxy
      this._makeAPICall("PUT", "assets/" + this.embedCode, {"status":"uploaded"}, function(){
       that._completeHandler();
      });
    },

    _notifyAsyncOperation: function(){
      this.__asyncOperationsControl.push(1);
    },

    _asyncOperationCompleted: function(){
      this.__asyncOperationsControl.pop();
      this._completeHandler();
    },

    _completeHandler: function(){
      var that = this;

      //Wait until all asynchronous operations have been completed
      if(this.__asyncOperationsControl.length){
        return;
      }

      //Clean up important attributes
      this.assetToUpload = null;
      this.embedCode = null;

      this.dispatchEvent(that.eventNames.COMPLETE, [that.embedCode]);
    },

    _errorHandler: function(error){
      this.dispatchEvent(this.eventNames.ERROR, [error]);
    },

    /**
     * Create an asset in preparation for uploading to Ooyala.
     *
     * @param name
     *   The name of the asset to create.
     * @param description
     *   The short text description of the asset.
     * @param file_name
     *   The file name of the asset being uploaded.
     * @param file_size
     *   The number of bytes of the asset to upload.
     * @param chunk_size
     *   The size of each chunk to upload in bytes.
     * @param asset_type
     *   Optional parameter of the asset type to create. Defaults to "video".
     *
     * @return
     *   An object containing the following properties:
     *   - embed_code: The embed code for the asset that was created.
     *   - uploading_urls: An array of URLs to upload each chunk to.
     */
    createAsset: function(name, description, file_name, file_size, chunk_size, asset_type) {
      var that = this;
      var body = {
        name: name,
        description: description,
        file_name: file_name,
        file_size: file_size,
        chunk_size: chunk_size,
        asset_type: (typeof asset_type != 'undefined') ? asset_type : 'video'
      };

      this._makeAPICall("POST", "assets", body, function(data){
        that.embedCode = data.embed_code;
        that.uploader.setUploadingURLs(data.uploading_urls);
        that.dispatchEvent(that.eventNames.ASSET_CREATION_COMPLETE);
      });
    },

    /**
     * Private method to call our remote API endpoint. All other code should
     * call methods such as createAsset instead of _makeAPICall() directly.
     *
     * @param method
     *   The HTTP method as a string, such as "POST" or "PATCH".
     * @param path
     *   The relative path to the resource within the endpoint.
     * @param body
     *   The object to use as the request body. The object will be converted to
     *   JSON before being POSTed.
     * @param success
     *   A callback function to call in the case of a sucessfull API call.
     * @param failure
     *   Optional parameter of a callback function to call in the case of a
     *   failed API call. Defaults to _errorHandler().
     * @param context
     *   Optional parameter of a reference to the object to use as the context
     *   for the request. Defaults to "this".
     */
    _makeAPICall: function(method, path, body, success, failure, context){
      context = context || this;

      //If no failure function has been provided, default to a function
      //that fires an error event in case of failure
      failure = failure || function(error){ this._errorHandler(error)};

      $.ajax({
        url: this.endpoint + '/' + path,
        type: method,
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(body)
      }).done(function(data){
        success.call(context, data);
      }).fail(function(error){
        failure.call(context, error);
      });
    }
  });
}).call(this, jQuery);

/**
* Base class for Uploaders
* */
(function($){
  Ooyala.Client.Uploader = function(){
    Ooyala.Client.EventDispatcher.call(this);
    this.chunk_size = 4194304;
    this.file = null;
    this.uploadingURLs = [];
    this.browseButton = null;
  };

  $.extend(Ooyala.Client.Uploader.prototype, new Ooyala.Client.EventDispatcher(), {
    setUploadingURLs: function(urls){
      this.uploadingURLs = urls;
      this.totalChunks = this.uploadingURLs.length;
    },

    upload: function(){
      throw new Error("This method should be implemented by a child object");
    },

    progress: function(){
      return 0;
    },

    assignBrowse: function(browseButton){
      this.browseButton = browseButton;
    }
  });
}).call(this, jQuery);

(function($){

  /**
   * Provision the browseElement with the file selector
   * @private
   * @note:Technique to add the invisible file selector taken from Resummable.js (https://github.com/23/resumable.js)
   * */
  var initHTMLFileSelector = function(){
    //This function is suppposed to be called using the context of the owner Object, 
    //which in this case is the Ooyala.Client.HTMLUploader.
    var that = this;
    var sel = document.createElement("input");
    sel.type = "file";

    this.browseButton.appendChild(sel);

    sel.addEventListener("change", function(e){
      that.file = sel.files[0];
      that.dispatchEvent("fileSelected");
    }, false);
  };

  Ooyala.Client.HTML5ChunkProvider = function(file, browseButton){
    Ooyala.Client.EventDispatcher.call(this);
    this.file = file;
    this.data = "";
    this.browseButton = browseButton;
    //Call private method to initialize the file selector button.
    initHTMLFileSelector.call(this);
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
}).call(this, jQuery);

(function($){

  /**
   * Pieces of code taken from resumable.js at https://github.com/23/resumable.js
   * */

  /**
   * Detect if the browser has support for the File API calls we need.
   * @private
   * */
  var isFileAPISuppported = function(){
    return typeof File !== "undefined" && (File.prototype.mozSlice || File.prototype.slice || File.prototype.webkitSlice);
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
        that.chunkProvider.detach("complete", onComplete);
        var bytes = that.chunkProvider.data;

        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function(){that.dispatchEvent("complete");});
        xhr.addEventListener("error", function(e){that.upload(e);}); //Retry

        xhr.open("POST", that.url);

        if(window.Blob && document.getElementById("flashChunkProvider")==null){
          var data = new FormData();
          data.append("chunk", bytes);
          xhr.send(data);
        }
        else{

          var boundary = "--------------------------" + Math.random().toString().replace("0.","");

          var body = "--" + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream' + (document.getElementById('flashChunkProvider')?
          '; Content-Transfer-Encoding: base64':'')+
          '\r\n\r\n' + bytes + "\r\n--" + boundary + "--\r\n";

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
    this.totalChunks = null;
    this.currentChunks = [];
    this.shouldStopBecauseOfError = false;
    this.browseButton = browseButton;
    this.chunkSize = 1*1024*1024;
    var that = this;

    var defaults = {
      maxChunkRetries: 3,
      maxNumberOfConcurrentChunks: 1
    };

    this.options = $.extend(defaults, options);

    if(isFileAPISuppported()){
      this.chunkProvider = new Ooyala.Client.HTML5ChunkProvider(this.file, this.browseButton);
    }
    else{
      throw new Error("Your browser does not support HTML5 file APIs.");
    } 
    
    this.chunkProvider.on("fileSelected", function(){
       that.file = that.chunkProvider.file;
       that.dispatchEvent("fileSelected");
     });
  };
   
    $.extend(Ooyala.Client.HTMLUploader.prototype, new Ooyala.Client.Uploader, {
    /**
     * Start uploading the selected file.
     * */
    upload: function(){
     this.totalChunks = this.uploadingURLs.length;
      for(var i = 0; i < this.options.maxNumberOfConcurrentChunks; i++){
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

      var uploadableChunk = new UploadableChunk(urlToUpload, this.chunkProvider, that.options.maxChunkRetries);
      //Upload the next chunk if this one has completed uploading
      uploadableChunk.on("complete", function(){
      that.chunksUploaded++; 
      that.uploadNextChunk();
      });

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
