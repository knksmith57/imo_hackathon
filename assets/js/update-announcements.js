// this was a work in progress for parsing changes in the code editor
// for accouncements / an *activity feed*
$(document).ready( function(){
   $("#show").click( function() {
      var text = $("#code").val();
      var output = text.match(/var\s+([a-z]|[A-Z])(\w*)+?((\,\s+([a-z]|[A-Z])(\w*)*)*)+?\;/g);
      if(!output) { console.log("output is null!"); }
      else {
         var out_array;
         for(var i=0; i<output.length; i++) {
            //console.log(output[i]);
            out_array = output[i].substring(4, output[i].length-1).split(",");
            for(var j=0; j<out_array.length; j++) {
               console.log(out_array[j].trim());
            }
         }
      }

      output = text.match(/function\s+([a-z]|[A-Z])(\w*)?\((\s*([a-z]|[A-Z])(\w*)\s*)(\,(\s*([a-z]|[A-Z])(\w*)\s*))*?\)\s*\{((\s*)(\w*)(\n*)*)\}/g);
      if(!output) { console.log("function output is bad!") }
      else {
         for(var i=0; i<output.length; i++) {
            console.log(output[i]);
         }
      }

   //alert(text);

   });


   //code here
});
