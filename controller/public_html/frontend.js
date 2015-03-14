'use strict';
var connected = false;
var server = null;
var client = new Eureca.Client();
var robot = null;
var x = 0;
var y = 0;


var radarCanvas  = new Canvas('radarCanvas', 400, 200);
var radarDisplay = new RadarDisplay(radarCanvas);	


// Client functions the server can call
 client.exports.status = function (text)
{
    //console.log("status text=" + text);
    $('#status').html(text);
}
 client.exports.setAll = function (x, y, heading, ping, turet)
{
    //console.log("ping text=" + text);
    $('#ping').html(ping);
    $('#x').html(x);
    $('#y').html(y);
    $('#heading').html(heading);
    $('#turet').html(turet);
    
    robot.command.ping      = parseInt(ping);
    robot.command.x         = parseInt(x);
    robot.command.y         = parseInt(y);
    robot.command.heading   = parseInt(heading);
    robot.command.turet     = parseInt(turet);    
}             

client.ready(function (proxy) {
    server = proxy;
    server.connect();
    connected = true;
});

