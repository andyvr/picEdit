picEdit
=======

*This plugin is work in progress! Use with caution!* 

The plugin will turn your form's ```<input type="file"...``` box into a tiny image editor/uploader. Perform basic image operations and preview your image before uploading to the server. The functionality for the plugin is very similar to the one introduced in pasteboard.co website and photobooth.js library.

In other words, your good old html form with the file upload field, like this:
<p align="center">
<img src="../../raw/gh-pages/img/img1.gif" />
</p>
will change to something more user-friendly:
<p align="center">
<img src="../../raw/gh-pages/img/img2.gif" />
</p>

**This plugin allows you to receive images from 3 different sources:**

1. You can search your computer for images by clicking on the image button in the center of the plugin, it will behave just like a regular file input field, you can also drag-and-drop your image on to the widget (work only in browsers that support drag and drop api)
2. You can use your computer/tablet web-camera to make a photo by clicking on the camera button in the center of the plugin (work only in browsers that support WebRTC)
3. You can copy and paste the image from the clipboard (work only in browsers that support clipboard api)

The plugin allows to perform image rotations, cropping, resizing and pen tool.
Once you're done with the image manipulations you can just upload the form as usual, the updated image will be uploaded along with the form as the a part of the form.

<h6><i>Note: Due to limitations of HTML5 Form API the form will be submitted with XMLHttpRequest/Ajax. The submission is handled by picEdit. If your form uses any js plugins or custom javascript this can create issues!</i></h6>

See the demo here: https://andyvr.github.io/picEdit/
###Usage Example

**Include jquery, the plugin js and css files**

```
<link rel="stylesheet" type="text/css" href="dist/css/picedit.min.css" />
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
<script type="text/javascript" src="dist/js/picedit.min.js"></script>
```

**Create a form in your html code with the file upload input box ex.:**

```
<form action="upload.php" method="post">
	Name: <input type="text" name="name">
	Image: <input type="file" name="image" id="image">
	<button type="submit">Submit</button>
</form>
```

**Bind the plugin to the file upload input box, that's it!**

```
<script type="text/javascript">
	$(function() {
		$('#image').picEdit();
	});
</script>
```


###Available methods and options

**defaultImage**

_type: string, default: false_ - an image to be loaded in the editor by default ('path/to/image')
<h6><i>use only images located on the same server to prevent CORS issues</i></h6>

**maxWidth**

_type: int/auto, default: 400_ - max width for the picedit element (the original image will not be re-scaled if it's wider than maxWidth, this parameter controls image preview only)

**maxHeight**

_type: int/auto, default: auto_ - max height for the picedit element (same as with maxWidth parameter)

**redirectUrl**

_type: string/bool, default: false_ - the form redirect url. When defined it will redirect the user to the specified url after the form is submitted.

**imageUpdated**

_type: func_ - the callback function to be called when the image is updated/changed. Exposes the image object as the first parameter of the function.
```
$('#image').picEdit({
  imageUpdated: function(img){
     alert('Image updated!');
  }
});
```

**formSubmitted**

_type: func_ - the callback function to be called once the form is submitted to the server. Exposes the XMLHttpRequest response object as the first parameter of the function.
```
$('#image').picEdit({
  formSubmitted: function(response){
     alert('Form submitted!');
  }
});
```


<p align="center">
<img src="../../raw/gh-pages/img/img1.jpg" />
</p>
