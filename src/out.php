<?php

echo "** Post Array **\n";
print_r($_POST);

echo "** Files Array **\n";
print_r($_FILES);

echo "** Image **\n";
foreach($_FILES as $file) {
	$imgData = base64_encode(file_get_contents($file['tmp_name']));
	$src = 'data: '.mime_content_type($img_file).';base64,'.$imgData;
	echo '<img src="'.$src.'"><br>';
}

?>