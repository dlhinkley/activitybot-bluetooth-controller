
'use strict';
var Command = (function() {

     var Command = function(text) {

    
        var self = this;
        self.x = null;
        self.y = null;
        self.heading = null;
        self.ping = null;
        self.turet = null;
        
        text = text.trim();
        
        var commandValues = text.split(',');
        //console.log("commandValues=",commandValues);
        
        for (var m = 0; m < commandValues.length; m++ ) {
            
            //console.log("commandValues[m]=" + commandValues[m] + ' m=' + m);
            var parts = commandValues[m].split('=');
            
            //console.log('parts=',parts);
            
            var command = parts[0];
            var value = parts[1];
            
            //console.log('command=' + command + ' value=' + value);
            
            if ( command === 'x' ) {
                
                self.x = parseInt(value);
            }
            else if ( command === 'y' ) {
                
                self.y = parseInt(value);
            }
            else if ( command === 'heading' ) {
                
                self.heading = parseInt(value);
            }
            else if ( command === 'ping' ) {
                
                if ( value === 'null' ) {
                    self.ping = null;
                }
                else {
                    self.ping = parseInt(value);
                }
            }
            else if ( command === 'turet' ) {
                
                self.turet = parseInt(value);
    
            }
         }
        
     };



  return Command;
})();
if (typeof(module) !== 'undefined') {
module.exports = Command;
}





