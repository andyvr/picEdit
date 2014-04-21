/*
 *  Project: PicEdit
 *  Description: Creates an image upload box with tools to edit images on the front-end before uploading
 *  Author: 
 *  License: 
 */

// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window is passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = 'picEdit',
        defaults = {
			propertyName: "value",
			maxWidth: 400,
			maxHeight: 'auto',
			aspectRatio: true
        };

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.inputelement = element;
		 this.element = element;

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;
		 // Reference to the loaded image
		 this._image = false;
		 // Interface variables (data synced from the user interface)
		 this._variables = {};
		 
		 /* Prepare the template */
		 /*unhide_in_prod*/
		 /*this._template();*/
		 /*unhide_in_prod*/
		 
		 /*hide_in_prod*/
        this.init();
		/*hide_in_prod*/
    }

	Plugin.prototype = {
		init: function () {
				// Place initialization logic here
				// You already have access to the DOM element and
				// the options via the instance, e.g. this.element
				// and this.settings
				// you can add more functions like the one below and
				// call them like so: this.yourOtherFunction(this.element, this.settings).
				
				// Save instance of this for inline functions
				var _this = this;
				// Get reference to the file input box
				this._fileinput = $('<input type="file" accept="image/*">');
				// Get reference to the canvas element
				this._canvas = $(this.element).find("canvas")[0];
				// Create and set the 2d context for the canvas
				this._ctx = this._canvas.getContext("2d");
				// Reference to video elemment holder element
				this._videobox = $(this.element).find(".picedit_video")[0];
				// Reference to the painter element
				this._painter = $(this.element).find(".picedit_painter")[0];
				// Save the reference to the messaging box
		 		this._messagebox = $(this.element).find(".picedit_message")[0];
		 		this._messagetimeout = false;
				// Size of the viewport to display image (a resized image will be displayed)
				 this._viewport = {
					"width": 0,
					"height": 0
				 };
				 // All variables responsible for cropping functionality
				 this._cropping = {
					 is_dragging: false,
					 is_resizing: false,
					 left: 0,
					 top: 0,
					 width: 0,
					 height: 0,
					 cropbox: $(this.element).find(".picedit_drag_resize")[0],
					 cropframe: $(this.element).find(".picedit_drag_resize_box")[0]
				 };
				// Bind onchange event to the fileinput to pre-process the image selected
				$(this._fileinput).on("change", function() {
					var file = this.files[0];
					var reader = new FileReader();
					reader.onload = function(e) { 
						_this._create_image_with_datasrc(e.target.result, false, file); 
					};
					reader.readAsDataURL(file);
				});
				// If Firefox (doesn't support clipboard object), create DIV to catch pasted image
				if (!window.Clipboard) { // Firefox
					var pasteCatcher = $(document.createElement("div"));
					pasteCatcher.attr("contenteditable","true").css({
						"position" : "absolute", 
						"left" : "-999",
						"width" : "0",
						"height" : "0",
						"overflow" : "hidden",
						"outline" : 0
					});
					$(document.body).prepend(pasteCatcher);
				}
				// Bind onpaste event to capture images from the the clipboard
				$(document).on("paste", function(event) {
					var items = (event.clipboardData  || event.originalEvent.clipboardData).items;
					var blob;
					if(!items) {
						pasteCatcher.get(0).focus();
						setTimeout(function(){
							var child = pasteCatcher.children().last().get(0);
							pasteCatcher.html("");
							if (child) {
								if (child.tagName === "IMG" && child.src.substr(0, 5) == 'data:') {
									_this._create_image_with_datasrc(child.src);
								}
							}
						}, 600);
					}
					else {
						for (var i = 0; i < items.length; i++) {
						  if (items[i].type.indexOf("image") === 0) {
							blob = items[i].getAsFile();
						  }
						}
						if(blob) {
						  var reader = new FileReader();
						  reader.onload = function(e) { _this._create_image_with_datasrc(e.target.result); };
						  reader.readAsDataURL(blob);
						}
					}
				});
				// Define formdata element
				this._theformdata = false;
				if(!window.FormData) this.set_messagebox("Sorry, the FormData API is not supported!");
				else this._theformdata = new FormData($(this.inputelement).parents("form")[0]);
				// Call helper functions
				this._bindControlButtons();
				this._bindInputVariables();
				this._bindSelectionDrag();
				// Set Default interface variable values
				this._variables.pen_color = "black";
				this._variables.pen_size = false;
				this._variables.prev_pos = false;
		},
		// Remove all notification copy and hide message box
		hide_messagebox: function () {
			$(this._messagebox).removeClass("active no_close_button").children("div").html("");
		},
		// Open a loading spinner message box or working... message box
		set_loading: function (message) {
			if(message && message == 1) {
				return this.set_messagebox("Working...", false, false);
			}
			else return this.set_messagebox("Loading...", false, false);
		},
		// Open message box alert with defined text autohide after number of milliseconds, display loading spinner
		set_messagebox: function (text, autohide, closebutton) {
			autohide = typeof autohide !== 'undefined' ? autohide : 2000;
			closebutton = typeof closebutton !== 'undefined' ? closebutton : true;
			var classes = "active";
			if(!closebutton) classes += " no_close_button";
			if(autohide) {
				clearTimeout(this._messagetimeout);
				var _this = this;
				this._messagetimeout = setTimeout(function(){ _this.hide_messagebox(); }, autohide);
			}
			return $(this._messagebox).addClass(classes).children("div").html(text);
		},
		// Toggle button and update variables
		toggle_button: function (elem) {
			if($(elem).hasClass("active")) {
				value = false;
				$(elem).removeClass("active");
			}
			else {
				value = true;
				$(elem).siblings().removeClass("active");
				$(elem).addClass("active");
			}
			var variable = $(elem).data("variable");
			if(variable) {
				var optional_value = $(elem).data("value");
				if(!optional_value) optional_value = $(elem).val();
				if(optional_value && value) value = optional_value;
				this._setVariable(variable, value);
			}
			if(this._variables.pen_color && this._variables.pen_size) this.pen_tool_open();
			else this.pen_tool_close();
		},
		// Perform image load when user clicks on image button
		load_image: function () {
			this._fileinput.click();
		},
		// Open pen tool and start drawing
		pen_tool_open: function () {
			this._ctx.lineJoin = "round";
			this._ctx.lineCap = "round";
			this._ctx.strokeStyle = this._variables.pen_color;
      		this._ctx.lineWidth = this._variables.pen_size;
			$(this._painter).addClass("active");
			this._hideAllNav();
		},
		// Close pen tool
		pen_tool_close: function () {
			$(this._painter).removeClass("active");
		},
		// Rotate the image 90 degrees counter-clockwise
		rotate_ccw: function () {
			if(!this._image) return this._hideAllNav(1);
			var _this = this;
			//run task and show loading spinner, the task can take some time to run
			this.set_loading(1).delay(10).promise().done(function() {
				_this._doRotation(-90);
				_this._resizeViewport();
				//hide loading spinner
				_this.hide_messagebox();
			});
			//hide all opened navigation
			this._hideAllNav();
		},
		// Rotate the image 90 degrees clockwise
		rotate_cw: function () {
			if(!this._image) return this._hideAllNav(1);
			var _this = this;
			//run task and show loading spinner, the task can take some time to run
			this.set_loading(1).delay(10).promise().done(function() {
				_this._doRotation(90);
				_this._resizeViewport();
				//hide loading spinner
				_this.hide_messagebox();
			});
			//hide all opened navigation
			this._hideAllNav();
		},
		// Resize the image
		resize_image: function () {
			if(!this._image) return this._hideAllNav(1);
			var _this = this;
			this.set_loading(1).delay(10).promise().done(function() {
				//perform resize begin
				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext("2d");
				canvas.width = _this._variables.resize_width;
				canvas.height = _this._variables.resize_height;
				ctx.drawImage(_this._image, 0, 0, canvas.width, canvas.height);
				_this._image.src = canvas.toDataURL("image/png");
				_this._resizeViewport();
				_this._paintCanvas();
				_this._updateInput();
				_this.hide_messagebox();
			});
			this._hideAllNav();
		},
		// Open video element and start capturing live video from camera to later make a photo
		camera_open: function() {
			var getUserMedia;
			var browserUserMedia = navigator.webkitGetUserMedia	||	// WebKit
									 navigator.mozGetUserMedia	||	// Mozilla FireFox
									 navigator.getUserMedia;			// 2013...
			if ( !browserUserMedia ) return this.set_messagebox("Sorry, your browser doesn't support WebRTC!");
			var _this = this;
			getUserMedia = browserUserMedia.bind( navigator );
			getUserMedia({
					audio: false,
					video: true
				},
				function( stream ) {
					var videoElement = $(_this._videobox).find("video")[0];
					//var videoElement = document.getElementById( 'video' );
					videoElement.src = URL.createObjectURL( stream );
					$(_this._videobox).addClass("active");
				},
				function( err ) {
					return _this.set_messagebox("No video source detected! Please allow camera access!");
				}
			);
		},
		camera_close: function() {
			$(this._videobox).removeClass("active");
		},
		take_photo: function() {
			var _this = this;
			var live = $(this._videobox).find("video")[0];
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext("2d");
			canvas.width = live.clientWidth;
			canvas.height = live.clientHeight;
			ctx.drawImage(live, 0, 0, canvas.width, canvas.height);
			this._create_image_with_datasrc(canvas.toDataURL("image/png"), function() {
				$(_this._videobox).removeClass("active");
			});
		},
		// Crop the image
		crop_image: function() {
			var crop = this._calculateCropWindow();
			var _this = this;
			this.set_loading(1).delay(10).promise().done(function() {
				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext("2d");
				canvas.width = crop.width;
				canvas.height = crop.height;
				ctx.drawImage(_this._image, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height);
				_this._image.src = canvas.toDataURL("image/png");
				_this._resizeViewport();
				_this._paintCanvas();
				_this._updateInput();
				_this.hide_messagebox();
			});
			this.crop_close();
		},
		crop_open: function () {
			if(!this._image) return this._hideAllNav(1);
			$(this._cropping.cropbox).addClass("active");
			this._hideAllNav();
		},
		crop_close: function () {
			$(this._cropping.cropbox).removeClass("active");
		},
		// Create and update image from datasrc
		_create_image_with_datasrc: function(datasrc, callback, file) {
			var _this = this;
			var img = document.createElement("img");
			if(file) img.file = file;
			img.src = datasrc;
			img.onload = function() {
				_this._image = img;
				_this._resizeViewport();
				_this._paintCanvas();
				_this._updateInput();
				if(callback && typeof(callback) == "function") callback();
			};
		},
		// Functions to controll cropping functionality (drag & resize cropping box)
		_bindSelectionDrag: function() {
			var _this = this;
			var eventbox = this._cropping.cropframe;
			
			var resizer = $(this._cropping.cropbox).find(".picedit_drag_resize_box_corner_wrap")[0];
			var painter = this._painter;
			$(window).on("mousedown", function(e) {
				_this._cropping.x = e.clientX;
   				_this._cropping.y = e.clientY;
				_this._cropping.w = eventbox.clientWidth;
   				_this._cropping.h = eventbox.clientHeight;
				$(eventbox).on("mousemove", function(event) {
					_this._cropping.is_dragging = true;
					if(!_this._cropping.is_resizing) _this._selection_drag_movement(event);
				});
				$(resizer).on("mousemove", function(event) {
					event.stopPropagation();
					_this._cropping.is_resizing = true;
					_this._selection_resize_movement(event);
				});
				$(painter).on("mousemove", function(event) {
					event.stopPropagation();
					_this._painter_movement(event);
				});
			}).on("mouseup", function() {
				if (!_this._cropping.is_dragging) { /*was clicking*/ }
				_this._cropping.is_dragging = false;
				_this._cropping.is_resizing = false;
				_this._variables.prev_pos = false;
				$(eventbox).off("mousemove");
				$(resizer).off("mousemove");
				$(painter).off("mousemove");
			});
		},
		_selection_resize_movement: function(e) {
			var cropframe = this._cropping.cropframe;
			cropframe.style.width = (this._cropping.w + e.clientX - this._cropping.x) + 'px';
   			cropframe.style.height = (this._cropping.h + e.clientY - this._cropping.y) + 'px';
		},
		_selection_drag_movement: function(e) {
			var cropframe = this._cropping.cropframe;
			$(cropframe).offset({
				top: e.pageY - parseInt(cropframe.clientHeight / 2, 10),
				left: e.pageX - parseInt(cropframe.clientWidth / 2, 10)
			});
		},
		_painter_movement: function(e) {
			var pos = {};
			pos.x = e.offsetX;
			pos.y = e.offsetY;
			if(!this._variables.prev_pos) {
				return this._variables.prev_pos = pos;
			}
			this._ctx.beginPath();
    		this._ctx.moveTo(this._variables.prev_pos.x, this._variables.prev_pos.y);
    		this._ctx.lineTo(pos.x, pos.y);
    		this._ctx.stroke();
			this._variables.prev_pos = pos;
		},
		// Hide all opened navigation and active buttons (clear plugin's box elements)
		_hideAllNav: function (message) {
			if(message && message == 1) {
				this.set_messagebox("Open an image or use your camera to make a photo!");
			}
			$(this.element).find(".picedit_nav_box").removeClass("active").find(".picedit_element").removeClass("active");
		},
		// Paint image on canvas
		_paintCanvas: function () {
			this._canvas.width = this._viewport.width;
    		this._canvas.height = this._viewport.height;
			this._ctx.drawImage(this._image, 0, 0, this._viewport.width, this._viewport.height);
			$(this.element).find(".picedit_canvas").css("display", "block");
		},
		// Helper function to translate crop window size to the actual crop size
		_calculateCropWindow: function (){
			var view = this._viewport;		//viewport sizes
			var real = {						//image real sizes
				"width": this._image.width,
				"height": this._image.height
			};
			var crop = {						//crop area sizes and position
				"width": this._cropping.cropframe.clientWidth,
				"height": this._cropping.cropframe.clientHeight,
				"top": (this._cropping.cropframe.offsetTop > 0) ? this._cropping.cropframe.offsetTop : 0.1,
				"left": (this._cropping.cropframe.offsetLeft > 0) ? this._cropping.cropframe.offsetLeft : 0.1
			};
			if((crop.width + crop.left) > view.width) crop.width = view.width - crop.left;
			if((crop.height + crop.top) > view.height) crop.height = view.height - crop.top;
			//calculate width and height for the full image size
			var width_percent = crop.width / view.width;
			var height_percent = crop.height / view.height;
			var area = {
				"width": parseInt(real.width * width_percent, 10),
				"height": parseInt(real.height * height_percent, 10)
			};
			//calculate actual top and left crop position
			var top_percent = crop.top / view.height;
			var left_percent = crop.left / view.width;
			area.top = parseInt(real.height * top_percent, 10);
			area.left = parseInt(real.width * left_percent, 10);
			return area;
		},
		// Helper function to perform canvas rotation
		_doRotation: function (degrees){
			var rads=degrees*Math.PI/180;
			//if rotation is 90 or 180 degrees try to adjust proportions
			var newWidth, newHeight;
			var c = Math.cos(rads);
			var s = Math.sin(rads);
			if (s < 0) { s = -s; }
			if (c < 0) { c = -c; }
			newWidth = this._image.height * s + this._image.width * c;
			newHeight = this._image.height * c + this._image.width * s;
			//create temporary canvas and context
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext("2d");
			canvas.width = parseInt(newWidth, 10);
			canvas.height = parseInt(newHeight, 10);
			// calculate the centerpoint of the canvas
			var cx=canvas.width/2;
			var cy=canvas.height/2;
			// draw the rect in the center of the newly sized canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.translate(cx, cy);
			ctx.rotate(rads);
			ctx.drawImage(this._image, -this._image.width / 2, -this._image.height / 2);
			this._image.src = canvas.toDataURL("image/png");
			this._paintCanvas();
			this._updateInput();
		},
		// Resize the viewport (should be done on every image change)
		_resizeViewport: function () {
			//get image reference
			var img = this._image;
			//set correct viewport width
			var viewport = {
				"width": img.width,
				"height": img.height
			};
			if(this.options.maxWidth != 'auto' && img.width > this.options.maxWidth) viewport.width = this.options.maxWidth;
			if(this.options.maxHeight != 'auto' && img.height > this.options.maxHeight) viewport.height = this.options.maxHeight;
			//calculate appropriate viewport size and resize the canvas
			if(this.options.aspectRatio) {
				var resizeWidth = img.width;
    			var resizeHeight = img.height;
				var aspect = resizeWidth / resizeHeight;
				if (resizeWidth > viewport.width) {
				  viewport.width = parseInt(viewport.width, 10);
				  viewport.height = parseInt(viewport.width / aspect, 10);
				}
				if (resizeHeight > viewport.height) {
				  aspect = resizeWidth / resizeHeight;
				  viewport.height = parseInt(viewport.height, 10);
				  viewport.width = parseInt(viewport.height * aspect, 10);
				}
			}
			//set the viewport size (resize the canvas)
			$(this.element).css({
				"width": viewport.width,
				"height": viewport.height
			});
			//set the global viewport
			this._viewport = viewport;
			//update interface data (original image width and height)
			this._setVariable("resize_width", img.width);
			this._setVariable("resize_height", img.height);
		},
		// Bind click and action callbacks to all buttons with class: ".picedit_control"
		_bindControlButtons: function() {
			var _this = this;
			$(this.element).find(".picedit_control").bind( "click", function() {
				// check to see if the element has a data-action attached to it
				var action = $(this).data("action");
				if(action) {
					_this[action](this);
				}
				// handle click actions on top nav buttons
				else if($(this).hasClass("picedit_action")) {
					$(this).parent(".picedit_element").toggleClass("active").siblings(".picedit_element").removeClass("active");
					if($(this).parent(".picedit_element").hasClass("active")) 
						$(this).closest(".picedit_nav_box").addClass("active");
					else 
						$(this).closest(".picedit_nav_box").removeClass("active");
				}
			});
		},
		// Bind input elements to the application variables
		_bindInputVariables: function() {
			var _this = this;
			$(this.element).find(".picedit_input").bind( "change keypress paste input", function() {
				// check to see if the element has a data-action attached to it
				var variable = $(this).data("variable");
				if(variable) {
					var value = $(this).val();
					_this._variables[variable] = value;
				}
				if((variable == "resize_width" || variable == "resize_height") && _this._variables.resize_proportions) {
					var aspect = _this._image.width / _this._image.height;
					if(variable == "resize_width") _this._setVariable("resize_height", parseInt(value / aspect, 10));
					else _this._setVariable("resize_width", parseInt(value * aspect, 10));
				}
			});
		},
		// Set an interface variable and update the corresponding dom element (M-V binding)
		_setVariable: function(variable, value) {
			this._variables[variable] = value;
			$(this.element).find('[data-variable="' + variable + '"]').val(value);
		},
		// update file input element with the modified image file info
		_updateInput: function() {
			if(!this._theformdata) return this.set_messagebox("Sorry, the FormData API is not supported!");
			var inputname = $(this.inputelement).prop("name");
			this._theformdata.append(inputname, this._image);
		},
		// Prepare the template here
		_template: function() {
			var template = 'compiled_template_markup';
			var _this = this;
			$(this.inputelement).hide().after(template).each(function() {
				_this.element = $(_this.inputelement).next(".picedit_box");
				_this.init();
			});
		}
	};

    // You don't need to change something below:
    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations and allowing any
    // public function (ie. a function whose name doesn't start
    // with an underscore) to be called via the jQuery plugin,
    // e.g. $(element).defaultPluginName('functionName', arg1, arg2)
    $.fn[pluginName] = function ( options ) {
        var args = arguments;

        // Is the first parameter an object (options), or was omitted,
        // instantiate a new instance of the plugin.
        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                // Only allow the plugin to be instantiated once,
                // so we check that the element has no plugin instantiation yet
                if (!$.data(this, 'plugin_' + pluginName)) {

                    // if it has no instance, create a new one,
                    // pass options to our plugin constructor,
                    // and store the plugin instance
                    // in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
                }
            });

        // If the first parameter is a string and it doesn't start
        // with an underscore or "contains" the `init`-function,
        // treat this as a call to a public method.
        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

            // Cache the method call
            // to make it possible
            // to return a value
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                // Tests that there's already a plugin-instance
                // and checks that the requested public method exists
                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    // Call the method of our plugin instance,
                    // and pass it the supplied arguments.
                    returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
                }

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                  $.data(this, 'plugin_' + pluginName, null);
                }
            });

            // If the earlier cached method
            // gives a value back return the value,
            // otherwise return this to preserve chainability.
            return returns !== undefined ? returns : this;
        }
    };

}(jQuery, window, document));