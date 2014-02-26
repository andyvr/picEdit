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
            propertyName: "value"
        };

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;
		
		 this._image = false;

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
		},
		// Perform image load when user clicks on image button
		load_image: function () {
			this._fileinput.click();
		},
		// Rotate the image 90 degrees clockwise
		rotate_cw: function () {
			if(!this._image) return this._hideAllNav();
			this._drawRotated(90);
			this._resizeViewport();
			// hide all opened navigation
			this._hideAllNav();
		},
		// Rotate the image 90 degrees counter-clockwise
		rotate_ccw: function () {
			if(!this._image) return this._hideAllNav();
			this._drawRotated(-90);
			this._resizeViewport();
			// hide all opened navigation
			this._hideAllNav();
		},
		// Hide all opened navigation and active buttons (clear plugin's box elements)
		_hideAllNav: function () {
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
		_drawRotated: function (degrees){
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
			var viewport = {
				"maxwidth": $(this.element).css("max-width"),
				"maxheight": $(this.element).css("max-height")
			};
			var img = this._image;
			//calculate appropriate viewport size and resize the canvas
			var bounds = {
				"w": parseInt(viewport.maxwidth),
				"h": parseInt(viewport.maxheight)
			};
			if(viewport.maxwidth != "none" && viewport.maxheight != "none") {
				//both width and height are constrained
			}
			else if(viewport.maxwidth != "none") {
				//only width is constrained
			}
			else if(viewport.maxheight != "none") {
				//only height is constrained
			}
			else {
				//fit viewport to the size of image
				viewport.width = img.width + "px";
				viewport.height = img.height + "px";
			}
			//set the viewport size
			$(this.element).css({
				"width": viewport.width,
				"height": viewport.height
			});
			//set the global viewport
			this._viewport = {
				"width": parseInt(viewport.width),
				"height": parseInt(viewport.height)
			};
		},
		// Bind click and action callbacks to all buttons with class: ".picedit_control"
		_bindControlButtons: function() {
			var that = this;
			$(this.element).find(".picedit_control").bind( "click", function() {
				// check to see if the element has a data-action attached to it
				var action = $(this).data("action");
				if(action) that[action](this);
				// handle click actions on top nav buttons
				else {
					$(this).parent(".picedit_element").toggleClass("active").siblings(".picedit_element").removeClass("active");
					if($(this).parent(".picedit_element").hasClass("active")) 
						$(this).closest(".picedit_nav_box").addClass("active");
					else 
						$(this).closest(".picedit_nav_box").removeClass("active");
				}
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