
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