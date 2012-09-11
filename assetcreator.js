(function($){

  Ooyala.Client.Events = {};

  Ooyala.Client.Events.PROGRESS = "progress";
  Ooyala.Client.Events.COMPLETE = "complete";
  Ooyala.Client.Events.ERROR = "error";
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

    if(this.browseButton){
      this.uploader.assignBrowse(this.browseButton);
    }

    this.assetToUpload = null;
    this.embedCode = "";
    this.__asyncOperationsControl = [];
  };

  $.extend(Ooyala.Client.AssetCreator.prototype, new Ooyala.Client.EventDispatcher, {
    createAsset: function(name, description, labels, metadata){
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
        labels: labels,
        metadata: metadata
      };

      var body =  {
          name: this.assetToUpload.name,
          description: this.assetToUpload.description,
          file_size: fileToUpload.size,
          file_name: fileToUpload.name,
          chunk_size: this.uploader.chunkSize,
          asset_type: "video"
      };

      //Take into consideration the Post Processing Status option if present
      if(this.options.postProcessingStatus){
        body.postProcessingStatus = this.options.postProcessingStatus;
      }

      //Send the asset creation call to the API Proxy and fire the corresponding events
      this._makeAPICall("POST", "assets", null, body, function(data){
        that.embedCode = data.embed_code;
        that.dispatchEvent(that.eventNames.ASSET_CREATION_COMPLETE);
      });
    },

    upload: function(){
      var that = this;

      //If we don't have an embed code, it means that the asset has not been created.
      //Fire an error event in that case.
      if(!this.embedCode){
        this.dispatchEvent(this.eventNames.ERROR, ["An asset has not been created."]);
        return;
      }

      this._makeAPICall("GET", "assets/" + this.embedCode + "/uploading_urls", null, null, function(data){
        that.uploader.setUploadingURLs(data);
        that.uploader.upload();
      });
    },

    assignLabels: function(labels, completionCallback, context){
      if(!this.embedCode){
        this._errorHandler("Asset has not been created");
        return;
      }

      context = context || this;

      this._makeAPICall("PUT", "assets/" + this.embedCode + "/labels", null, labels, function(){
        completionCallback.call(context);
      });
    },

    assignMetadata: function(metadata, completionCallback, context){
      if(!this.embedCode){
        this._errorHandler("Asset has not been created");
        return;
      }

      this._makeAPICall("PUT", "assets/" + this.embedCode + "/metadata", null, metadata, function(){
        completionCallback.call(context);
      });
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
      this._makeAPICall("PUT", "assets/" + this.embedCode + "/upload_status", null, {"status":"uploaded"}, function(){
       // if no labels nor metadata, complete the call
       if (!that.assetToUpload.labels && !that.assetToUpload.metadata) {
         that._completeHandler();
         return;
       }

       if(that.assetToUpload.labels) {
         that._notifyAsyncOperation();
         that.assignLabels(that.assetToUpload.labels, function(){
           that._asyncOperationCompleted();
         });
       }

       if(that.assetToUpload.metadata) {
         that._notifyAsyncOperation();
         that.assignMetadata(that.assetToUpload.metadata, function(){
           that._asyncOperationCompleted();
          });
       }
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
    createAsset: function(name, description, file_size, chunk_size, asset_type) {
      var body = {
        name: name,
        description: description,
        file_size: file_size,
        chunk_size: chunk_size,
        asset_type: (typeof asset_type != undefined) ? asset_type : 'video'
      };

      _makeApiCall("POST", "assets", null, body);
    },

    _makeAPICall: function(method, path, params, body, success, failure, context){
      context = context || this;

      //If no failure function has been provided, default to a function
      //that fires an error event in case of failure
      failure = failure || function(error){ this._errorHandler(error)};

      $.ajax({
        url: this.endpoint,
        type: "POST",
        dataType: "json",
        data: {
          path: path,
          method: method,
          body: JSON.stringify(body),
          query_params: JSON.stringify(params)
        }
      }).done(function(data){
        success.call(context, data);
      }).fail(function(error){
        failure.call(context, error);
      });
    }
  });
}).call(this, jQuery);
