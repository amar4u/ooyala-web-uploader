if(!window.Ooyala){
  window.Ooyala = {};
}

Ooyala.Client = {} || Ooyala.Client;

Ooyala.Client.UploaderEvents = {};

Ooyala.Client.UploaderEvents.PROGRESS = "progress";
Ooyala.Client.UploaderEvents.COMPLETE = "complete";
Ooyala.Client.UploaderEvents.ERROR = "error";
Ooyala.Client.UploaderEvents.ASSET_CREATION_COMPLETE = "assetCreationComplete";

Ooyala.Client.Uploader = function(apiProxy, browseButton, dropArea, options){
  if(typeof(jQuery) == "undefined"){
    throw new Error("This uploader needs jQuery 1.5+ to be loaded.");
  }
  if(typeof(JSON) == "undefined"){
    throw new Error("This uploader depend's on Douglas Crockford's JSON parser (https://github.com/douglascrockford/JSON-js) " + 
                    "or one of the following browsers: Internet Explorer 8+, Firefox 3.1+, Safari 4+, Chrome 3+, and Opera 10.5+.");
  }
  if(!apiProxy){
    throw new Error("Please provide an Ooyala API Proxy.");
  }
  if(!browseButton && !dropArea){
    throw new Error("You need to provide either a button element to fire the file browsing action or a file drop area element.");
  }

  this.browseButton = browseButton;
  this.dropArea = dropArea;
  this.apiProxy = apiProxy;
  this.eventHandlers = {};
  this.options = options || {};
  this.eventNames = Ooyala.Client.UploaderEvents;

  this.resumableUploader = new Resumable();
  this.resumableUploader.on(this.eventNames.PROGRESS, this._progressHandler);
  this.resumableUploader.on(this.eventNames.COMPLETE, this._uploadCompleteHandler);
  this.resumableUploader.on(this.eventNames.ERROR, this._errorHandler);

  if(this.browseButton){
    this.resumableUploader.assignBrowse(this.browseButton);
  }
  if(this.dropArea){
    this.resumableUploader.assignDrop(this.dropArea);
  }

  this.assetToUpload = null;
  this.embedCode = "";
  this.__asyncOperationsControl = [];
};

Ooyala.Client.Uploader.prototype = {
  createAsset: function(name, description, labels, metadata){
    var that = this;

    //Dispatch error event if the user has not selected a file
    if(!this.resumableUploader.files[0]){
      this._errorHandler("The user has not selected a file.");
      return;
    }

    var fileToUpload = this.resumableUploader.files[0];

    this.assetToUpload = {
      name: name,
      description: description,
      labels: labels,
      metadata: metadata
    };

    var body =  {
        name: this.objectToUpload.name,
        description: this.objectToUpload.description,
        file_size: fileToUpload.size,
        file_name: fileToUpload.name,
        chunk_size: this.resumableUploader.opts.chunkSize,
    };

    //Take into consideration the Post Processing Status option if present
    if(this.options.postProcessingStatus){
      body.postProcessingStatus = this.options.postProcessingStatus;
    }

    //Send the asset creation call to the API Proxy and fire the corresponding events
    this._makeAPICall("POST", "assets", null, body, function(data){
      that.embedCode = data.embed_code;
      that._fireEvent(that.eventNames.ASSET_CREATION_COMPLETE);
    });
  },

  upload: function(){
    var that = this;

    //If we don't have an embed code, it means that the asset has not been created.
    //Fire an error event in that case.
    if(!this.embedCode){
      this._fireEvent(this.eventNames.ERROR, ["An asset has not been created."]);
      return;
    }

    this._makeAPICall("GET", "assets" + this.embedCode + "/uploading_urls", null, null, function(data){
      this.resumableUploader.setUploadingURLs(data);
      this.resumableUploader.upload();
    });
  },

  assigLabels: function(labels, completionCallback, context){
    if(!this.embedCode){
      this._errorHandler("Asset has not been created");
      return;
    }

    context = context || this;

    this._makeAPICall("PUT", "assets/" + this.embedCode + "/labels", function(){
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
    return this.resumableUploader ? this.resumableUploader.progress() : 0;
  },

  on: function(eventName, eventHandler, context){
    if(!this.eventHandlers[eventName]){
      this.eventHandlers[eventName] = [];
    }

    context = context || this;

    this.eventHandlers[eventName].push({handler: eventHandler, context: context});
  },

  _progressHandler: function:(){
    this._fireEvent(this.eventNames.PROGRESS);
  },

  _uploadCompleteHandler: function(){
    var that = this;

    //Update the uploading_status of the asset via the API Proxy
    this._makeAPICall("POST", "assets/" + this.embedCode + "/uploading_status", null, {"status":"uploaded"}, function(){
      if(that.assetToUpload.labels){
        that._notifyAsyncOperation();
        that.assigLabels(that.assetToUpload.labels, function(){
          that._asyncOperationCompleted();
        });
      }
      else if(that.assetToUpload.metadata){
        that.__asyncOperationsControl.push(1);
        that.assignMetadata(that.assetToUpload.metadata, function(){
          that._asyncOperationCompleted();
        });
      }
      else{
        that._completeHandler();
      }
    });
  },

  _notifyAsyncOperation: function(){
    this.__asyncOperationsControl.push(1);
  },

  _asyncOperationCompleted: function(){
    this.__asyncOperationsControl.pop();
    this._completeHandler();
  }

  _completeHandler: function(){
    //Wait until all asynchronous operations have been completed
    if(this.__asyncOperationsControl.length){
      return;
    }

    //Clean up important attributes
    this.assetToUpload = null;
    this.embedCode = null;

    this._fireEvent(that.eventNames.COMPLETE, [that.embedCode]);
  },

  _errorHandler: function(error){
    this._fireEvent(this.eventNames.ERROR, [error]);
  },

  _fireEvent: function(eventName, args){
    var handlers = this.eventHandlers[eventName];

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
  },

  _makeAPICall: function(method, path, params, body, success, failure, context){
    context = context || this;

    //If no failure function has been provided, default to a function 
    //that fires an error event in case of failure
    failure = failure || function(error){ this._errorHandler(error)};

    $.ajax({
      url: this.apiProxy,
      type: method,
      dataType: "json",
      data: {
        path: path,
        method: method,
        body: encodeURIComponents(JSON.stringify(body))
      }
    }).done(function(data){
      success.call(context, data);  
    }).fail(function(error){
      failure.call(context, error); 
    });
  }
};
