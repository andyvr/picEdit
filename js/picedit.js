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
        this.element = element;
		
		 // Save the reference to the messaging box
		 this._messagebox = $(element).find(".picedit_message")[0];
		 this._messagetimeout = false;

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
		 // Size of the viewport to display image (a resized image will be displayed)
		 this._viewport = {
			"width": 0,
			"height": 0
		 };

        this.init();
    }

	Plugin.prototype = {
		init: function () {
				// Place initialization logic here
				// You already have access to the DOM element and
				// the options via the instance, e.g. this.element
				// and this.settings
				// you can add more functions like the one below and
				// call them like so: this.yourOtherFunction(this.element, this.settings).
				//console.log("xD");
				
				// Save instance of this for inline functions
				var that = this;
				// Get reference to the file input box
				this._fileinput = $(this.element).find(".imageload")[0];
				// Get reference to the canvas element
				this._canvas = $(this.element).find("canvas")[0];
				// Create and set the 2d context for the canvas
				this._ctx = this._canvas.getContext("2d");
				// Bind onchange event to the fileinput to pre-process the image selected
				$(this._fileinput).on( "change", function() {
					var file = this.files[0];
					var img = document.createElement("img");
					img.file = file;
					var reader = new FileReader();
					reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(img);
					reader.readAsDataURL(file);
					//wait till the data are loaded in
					img.onload = function() {
						that._image = img;
						that._resizeViewport();
						that._paintCanvas();
					};
				});
				this._bindControlButtons();
				this._bindInputVariables();
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
				var that = this;
				this._messagetimeout = setTimeout(function(){ that.hide_messagebox(); }, autohide);
			}
			return $(this._messagebox).addClass(classes).children("div").html(text);
		},
		// Toggle resize proportions on or off
		toggle_resize_proportions: function (elem) {
			if($(elem).hasClass("active")) {
				this._variables.resize_proportions = false;
				$(elem).removeClass("active");
			}
			else {
				this._variables.resize_proportions = true;
				$(elem).addClass("active");
			}
		},
		// Perform image load when user clicks on image button
		load_image: function () {
			this._fileinput.click();
		},
		// Rotate the image 90 degrees counter-clockwise
		rotate_ccw: function () {
			if(!this._image) return this._hideAllNav(1);
			var that = this;
			//run task and show loading spinner, the task can take some time to run
			this.set_loading(1).delay(10).promise().done(function() {
				that._doRotation(-90);
				that._resizeViewport();
				//hide loading spinner
				that.hide_messagebox();
			});
			//hide all opened navigation
			this._hideAllNav();
		},
		// Rotate the image 90 degrees clockwise
		rotate_cw: function () {
			if(!this._image) return this._hideAllNav(1);
			var that = this;
			//run task and show loading spinner, the task can take some time to run
			this.set_loading(1).delay(10).promise().done(function() {
				that._doRotation(90);
				that._resizeViewport();
				//hide loading spinner
				that.hide_messagebox();
			});
			//hide all opened navigation
			this._hideAllNav();
		},
		// Resize the image
		resize_image: function () {
			if(!this._image) return this._hideAllNav(1);
			var that = this;
			this.set_loading(1).delay(10).promise().done(function() {
				//perform resize begin
				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext("2d");
				canvas.width = that._variables.resize_width;
				canvas.height = that._variables.resize_height;
				ctx.drawImage(that._image, 0, 0, canvas.width, canvas.height);
				that._image.src = canvas.toDataURL("image/png");
				that._paintCanvas();
				//perform resize end
				that._resizeViewport();
				that.hide_messagebox();
			});
			this._hideAllNav();
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
			canvas.width = parseInt(newWidth);
			canvas.height = parseInt(newHeight);
			// calculate the centerpoint of the canvas
			var cx=canvas.width/2;
			var cy=canvas.height/2;
			// draw the rect in the center of the newly sized canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.translate(cx, cy);
			ctx.rotate(rads);
			ctx.drawImage(this._image, -this._image.width/2, -this._image.height/2);
			this._image.src = canvas.toDataURL("image/png");
			this._paintCanvas();
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
				  viewport.width = parseInt(viewport.width);
				  viewport.height = parseInt(viewport.width / aspect);
				}
				if (resizeHeight > viewport.height) {
				  aspect = resizeWidth / resizeHeight;
				  viewport.height = parseInt(viewport.height);
				  viewport.width = parseInt(viewport.height * aspect);
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
			var that = this;
			$(this.element).find(".picedit_control").bind( "click", function() {
				// check to see if the element has a data-action attached to it
				var action = $(this).data("action");
				if(action) {
					that[action](this);
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
			var that = this;
			$(this.element).find(".picedit_input").bind( "change", function() {
				// check to see if the element has a data-action attached to it
				var variable = $(this).data("variable");
				if(variable) {
					var value = $(this).val();
					that._variables[variable] = value;
				}
				if((variable == "resize_width" || variable == "resize_height") && that._variables.resize_proportions) {
					var aspect = that._image.width / that._image.height;
					if(variable == "resize_width") that._setVariable("resize_height", parseInt(value / aspect));
					else that._setVariable("resize_width", parseInt(value * aspect));
				}
			});
		},
		// Set an interface variable and update the corresponding dom element (M-V binding)
		_setVariable: function(variable, value) {
			this._variables[variable] = value;
			$(this.element).find('[data-variable="' + variable + '"]').val(value);
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