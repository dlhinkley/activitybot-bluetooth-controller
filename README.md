# activitybot-bluetooth-controller
This is a controller I wrote for my Parallax Activitybot to allow it to be controlled over bluetooth from a web page connected through a NodeJS app. 

## How it works
The Activitybot has the RN-42 bluetooth interface.  The NodeJS app uses Eelco's [node-bluetooth-serial-port (https://github.com/eelcocramer/node-bluetooth-serial-port)] NodeJS module to connect to the robot. It also uses Alaa-eddine K's [eureca.io (http://eureca.io/)] to handle communication between the NodeJS App and the web page.

## Requirements
* [ActivityBot (https://www.parallax.com/product/32500)]
* [RN-42 Bluetooth Module (https://www.parallax.com/product/30086)]
* [OPTIONAL Turet (https://www.parallax.com/product/910-28015a)]
* [SimpleIDE for Propeller C (http://learn.parallax.com/node/640)]
* Computer with bluetooth that can run NodeJS
 
## Installation
* Install SimpleIDE
* Change to SimpleIDE workspace (i.e. ..../SimpleIDE)
* `git clone https://github.com/dlhinkley/activitybot-bluetooth-controller.git`
* Load the code at robot/activityBot.side into Activity Bot
* `cd activitybot-bluetooth-controller/controller`
* `npm install`
* `node --harmony-proxies index.js`

## Running
* Turn on Activity Bot
* `node --harmony-proxies index.js`
* Open a browser and visit http://localhost:8000
* Wait for Status to change to "Connected"
* Drive the robot using the controls