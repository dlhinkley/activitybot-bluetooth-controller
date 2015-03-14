'use strict';

/**
* Responsible for recieving commands from the front end, then sending them to the robot
* Also serves as webserver for the front end
*/

// https://github.com/eelcocramer/node-bluetooth-serial-port
//
var blueTooth = null;
var received = '';
var rxIn = '';
var prevCommand = '';
var eurecaClient = null;

var Command = require('./command.js');

// https://github.com/TooTallNate/keypress
/*
 Add the following to line 231 of index.js in keypress code to enable numbers
 else if (s.length === 1 && s >= '0' && s <= '9') {
    // Number
    key.name = s;

  } 
*/
/* var keypress = require('keypress'); */

var turet = null;

var commandKeyMatrix = {
                        'up': 'rampUp',
                        'left': 'rampLeft',
                        'right': 'rampRight',
                        'down': 'rampDown',
                        'slow': 'slow', // slow
                        'stop': 'stop', // stop
                        'scan': 'scan', // Turet scan 
};
function init() {

    initEureca();

    turet = new Turet();
    
    blueTooth = new BlueTooth();
    
}


function receivedText(text) {
    
   //console.log('receivedText text=' + text);
       
   received = rxIn;
   
   if ( text.length > 14 && text.substring(0, 14) == 'command=update') {
       
       processUpdateCommand(text);
   }
   else if ( prevCommand === commandKeyMatrix.ping ) {
       
       console.log('eureca ping text=' + text);
       eurecaClient.ping(text);
   }
   else if ( prevCommand === commandKeyMatrix.coords ) {
       
       console.log('eureca coords text=' + text);
       eurecaClient.coords(text);
   }
   
}
function processUpdateCommand(text) {
    
    var cmd = new Command(text);
    
    eurecaClient.setAll( cmd.x, cmd.y, cmd.heading, cmd.ping, cmd.turet);
    
    turet.setDirection(cmd.turet);
    
}

/**
* Wrapper for node's bluetooth serial from https://github.com/eelcocramer/node-bluetooth-serial-port
*/
function BlueTooth() {

    var self = this,
        btSerial = null;
    
    function init() {
    
        //console.log('initSerial');
    
        btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
    
        btSerial.on('failure', btSerialFailureEvent);
        
        btSerial.on('found', btSerialFoundEvent);
        
        
    }
    self.connect = function() {
        
        console.log('bluetooth connecting..');
        
/*
        if ( btSerial.isOpen() ) {
            
            btSerial.close();
        }
*/
        // Starts searching for bluetooth devices. When a device is found a 'found' event will be emitted.
        btSerial.inquire();
    }
    self.sendCommand = function (command) {
    
       console.log('BlueTooth.sendCommand command=' + command);
       
       // Send command to robot
        btSerial.write(new Buffer(command + "\n", 'utf-8'), function(err, bytesWritten) {
        
            if (err)  { 
                console.log(err);
            }
            else {
                
                prevCommand = command;
            }
            //console.log("bytesWritten=",bytesWritten);
        }); 
    }
    function btSerialFailureEvent(err) {
        
        console.log("btSerialFailureEvent err=",err);
    }
    function btSerialDataEvent(buffer) {
                        
        var out = buffer.toString('utf-8');
        //console.log('data out=' + out);
        
        for (var m = 0; m < out.length; m++) {
            
            ///console.log('data m=' + m + ' char=' + out.charAt(m));
            
            if ( out.charAt(m) === '\n' ) {
                
                receivedText(rxIn);
                rxIn = '';
                //console.log('received=' + received);
            }
            else {
                
                rxIn += out.charAt(m);
            }
        }
    }
    function btSerialFoundEvent(address, name) {
    
    	console.log('address=' + address);
    	console.log('name=' + name);
    	
    	eurecaClient.status('found bluetooth');
    	
    	if (name === 'RN42-9699' && address == '00-06-66-65-96-99' ) {
    	
            btSerial.findSerialPortChannel(address, function(channel) {
            
                btSerial.connect(address, channel, function() {
                
                    console.log('connected');
                    eurecaClient.status('connected');

                    // Prepare response for command
                    //
                    btSerial.on('data', btSerialDataEvent);  
                    
                    self.sendCommand("connected\n");                 
                    
                }, function (error) {
                    console.log('cannot connect',error);
                });
        
                // close the connection when you're ready
                //btSerial.close();
                
            }, function(error) {
                console.log('found nothing',error);
            });
    	}
    	else {
    
    		console.log('skipping ' + name);
    	}
    }
    
    init();
}
function initEureca() {
    
     console.log('initEureca');


    var express = require('express')
      , app = express(app)
      , server = require('http').createServer(app);
    var EurecaServer = require('eureca.io').EurecaServer;
     
    //Allow the server to access these client calls
    var eurecaServer = new EurecaServer({allow:['status','setAll']});
     
    eurecaServer.attach(server);
     
    // ... server initialisation
    eurecaServer.exports.connect = function () {
     //when a server side function is called
     //we can access the client connection
     //throught this.connection
     
        var conn = this.connection;
        eurecaClient = eurecaServer.getClient(conn.id);
        console.log('browser connected');
        eurecaClient.status('initilized'); // Call the client's code
        
        blueTooth.connect();

    }    
    //functions under "exports" namespace will be exposed to client side
    eurecaServer.exports.sendCommand = function (command) {
        console.log('Eureca sendCommand ' + command);
        blueTooth.sendCommand(command);
    }
    eurecaServer.exports.up = function () {
        console.log('Eureca up');
        blueTooth.sendCommand(commandKeyMatrix.up+ " 60");
    }
    eurecaServer.exports.left = function () {
        console.log('Eureca left');
        blueTooth.sendCommand(commandKeyMatrix.left+ " 60");
    } 
    eurecaServer.exports.right = function () {
        console.log('Eureca right');
        blueTooth.sendCommand(commandKeyMatrix.right+ " 60");
    } 
    eurecaServer.exports.down = function () {
        console.log('Eureca down');
        blueTooth.sendCommand(commandKeyMatrix.down+ " 60");
    }     
    eurecaServer.exports.stop = function () {
        console.log('Eureca stop');
        blueTooth.sendCommand(commandKeyMatrix.stop+ " 60");
    }     
    eurecaServer.exports.slow = function () {
        console.log('Eureca slow');
        blueTooth.sendCommand(commandKeyMatrix.slow+ " 60");
    }     
    eurecaServer.exports.ping = function () {
        console.log('Eureca ping');
        blueTooth.sendCommand(commandKeyMatrix.ping+ " 60");
    }     
    eurecaServer.exports.scan = function () {
        console.log('Eureca turet scan');
        blueTooth.sendCommand(commandKeyMatrix.scan + " 60");
    }     
    eurecaServer.exports.turetLeft = function () {
        console.log('Eureca turet left');
        turet.left();
        blueTooth.sendCommand( turet.getCommand());
    }     
    eurecaServer.exports.turetRight = function () {
        console.log('Eureca turet right');
        turet.right();
        blueTooth.sendCommand( turet.getCommand());
    }     
    eurecaServer.exports.turetStraight = function () {
        console.log('Eureca turet straight');
        turet.straight();
        blueTooth.sendCommand( turet.getCommand() );
    }     
    
    
       //------------------------------------------
     
    //see browser client side code for index.html content
/*
    app.get('/', function (req, res, next) {
        res.sendfile('index.html');
    });
*/
    app.use(express.static(__dirname + '/public_html'));
    
    server.listen('8000');
    
    console.log("");
    console.log("");
    console.log("Access/Refreash http://localhost:8000 to continue");
    
}
function Turet() {
    
    var self = this;
    self.direction = 0;
    
    self.directions = [
    {'deg':'0','cmd': 'q'},
    {'deg':'22','cmd':'w'},
    {'deg':'45','cmd':'e'},
    {'deg':'67','cmd':'r'},
    {'deg':'90','cmd':'t'},
    {'deg':'112','cmd':'y'},
    {'deg':'135','cmd':'u'},
    {'deg':'157','cmd':'i'},
    {'deg':'180','cmd':'o'}
    ];
    self.pointer = 4; // default to 90 degree
    
    self.right = function() {
        
        if ( self.pointer - 1 >= 0 )  {
            
            self.pointer--;
        }
    }
    self.getCommand = function() {
        
        return "turet " + self.directions[ self.pointer ].deg;
    }
    self.left = function() {
        
        if ( self.pointer + 1 < self.directions.length )  {
            
            self.pointer++;
        }
    }
    self.straight = function() {
        
        self.setDirection('90');
    }
    self.setDirection = function(value) {
        
        self.direction = value;
        
        for ( var m = 0; m < self.directions.length; m++) {
            
            if ( self.directions[m].deg === value ) {
                
                self.pointer = m;
            }
        }
    }
    
}
init();
