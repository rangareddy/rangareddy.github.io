
function copy_text_to_clipboard(div_id, msg) {
	var copiedText = document.getElementById(div_id);
	var range = document.createRange();
	var selection = window.getSelection();
	range.selectNodeContents(copiedText);  
	selection.removeAllRanges();
	selection.addRange(range);
	var successful = document.execCommand("copy");
	selection.removeAllRanges();
	if(successful){
		if(!msg) {
			msg = "Text copied successfully!"
		} 
        alert(msg);
    } else {
        alert('Unable to copy');
    }     
}

$.fn.selectRange = function(options) {

    var $settings = $.extend({min: 0, max: 20}, options),
        $options = '',
        $val = options.select;

    this.empty();
    for(i = $settings.min; i <= $settings.max; i++) {
        $options += '<option value="' + i + '"' + (i == $val ? ' selected="selected"' : '') + '>' + i + '</option>';
    }
    return this.html($options);
};