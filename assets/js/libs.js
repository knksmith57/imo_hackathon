// jquery plugin to set cursor position
// from @Mark on http://stackoverflow.com/users/65387/mark
// example == http://jsfiddle.net/mnbayazit/WpqsN/
$.fn.selectRange = function(start, end) {
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

// http://stackoverflow.com/questions/1891444/how-can-i-get-cursor-position-in-a-textarea
// by @Ryan http://stackoverflow.com/users/207852/ryan
$.fn.getCursorPosition = function() {
   var el = $(this).get(0);
   var pos = 0;
   if('selectionStart' in el) {
      pos = el.selectionStart;
   } else if('selection' in document) {
      el.focus();
      var Sel = document.selection.createRange();
      var SelLength = document.selection.createRange().text.length;
      Sel.moveStart('character', -el.value.length);
      pos = Sel.text.length - SelLength;
   }

   return pos;
}
