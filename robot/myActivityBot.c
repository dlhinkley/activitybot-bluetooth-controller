/*
* Accepts and executes command recieved over bluetooth.  The commands are a two parts, the function and argument.
* For example the command "right 90" turns the robot right 90 degrees.
* 
* The robot also tracks it's heading and x y location using code from:
* https://github.com/chrisl8/ActivityBot/blob/master/Propeller/ROS%20Interface%20for%20ActivityBot.c
*
*
*/

#include "simpletools.h"
#include "abdrive.h"                    
#include "fdserial.h"
#include "servo.h"                           
#include "ping.h"


// Define globals
//
fdserial *blue;


const int TUR = 17,       // Turet pin
          PING = 16,      // Ping pin
          BTRX = 2,       // Bluetooth RX (Note remember on the RN-42 the pins are swapped) TX from card goes into RX on Propeller
          BTTX = 1,       // Bluetooth TX
          BTSPEED = 9600; // Bluetooth speed

int correction = -190; // turret correction

// For Odometry
int ticksLeft, ticksRight, ticksLeftOld, ticksRightOld;
static double trackWidth, distancePerCount;

static volatile double heading = 0.0, x = 0.0, y = 0.0, degHeading;
static volatile int pingRange0 = 0, turetHeading = 0, connected = 0, turetScan = 0;
char lastcmdbuf[10];                             // Command buffer


// Define subroutines
//
void executeCommand(char *, int);
void calcCoordinates();
void stopIfWall();
void positionTuret(char);
void pollPingSensors(void *par); // Use a cog to fill range variables with ping distances
unsigned int pstack[256]; // If things get weird make this number bigger!


/**
 * Main loop
 */
int main()                             
{


	// Turn off LEDs
	low(27);                   
	low(26);

	// Turn off terminal and open bluetooth port     
	simpleterm_close(); 
	blue = fdserial_open(BTRX, BTTX, 0, BTSPEED);

	// Start the ping cog
	cogstart(&pollPingSensors, NULL, pstack, sizeof(pstack));


	freqout(5, 2000, 2000);               // Start beep - low battery reset alarm http://learn.parallax.com/propeller-c-simple-circuits/piezo-beep

	trackWidth = 0.1058; // http://learn.parallax.com/activitybot/calculating-angles-rotation
	distancePerCount = 0.00325;


	drive_speed(0,0);                     // Start servos/encoders cog
	drive_setRampStep(10);                // Set ramping at 10 ticks/sec per 20 ms

  
	int dir = 900 + correction;
	servo_angle(TUR, dir);
	turetHeading  = 90;


	// Outer loop
	while(1)                               
	{


		// Text manuver from: http://learn.parallax.com/activitybot/text-file-maneuver-list
		//
		calcCoordinates();  // Check for ticks

		if (fdserial_rxReady(blue) != 0) { // Non blocking check for data in the input buffer
			connected = 1;


			char sbuf[20]; // A Buffer long enough to hold the longest line  may send.
			int count = 0;
			while (count < 20) {
				sbuf[count] = readChar(blue);
				if (sbuf[count] == '\r' || sbuf[count] == '\n') // Read until return
					break;
				count++;
			}

			char cmdbuf[10];                             // Command buffer
			char valbuf[4];                              // Text value buffer
			int  val;   
			int i = 0;                                 // Declare index variable
			// Parse command
			while(!isalpha(sbuf[i])) i++;             // Find 1st command char

			sscan(&sbuf[i], "%s", cmdbuf);            // Command -> buffer

			i += strlen(cmdbuf);                     // Idx up by command char count

			//if(!strcmp(cmdbuf, "end")) break;        // If command is end, break

			// Parse distance argument
			while(!isdigit(sbuf[i])) i++;             // Find 1st digit after command

			sscan(&sbuf[i], "%s", valbuf);            // Value -> buffer

			i += strlen(valbuf);                     // Idx up by value char count

			val = atoi(valbuf);                      // Convert string to value   

			executeCommand(cmdbuf, val);


		}                       
	}            
}

/**
 * Given an array with the current command and a numeric value argument to the command,
 * execute the command
 */
void executeCommand(char cmdbuf[], int  val) {


	if ( strcmp(cmdbuf,"scan") == 0) {

		// Toggle the scan status
		if ( turetScan == 0 ) {

			turetScan = 1;
		}
		else {

			turetScan = 0;
			int dir = 900 + correction;
			servo_angle(TUR, dir);
			turetHeading  = 90;
		}                         
	}
	else if ( strcmp(cmdbuf,"speed") == 0 ) {
    drive_setMaxSpeed(val);
	}
	else if ( strcmp(cmdbuf,"up") == 0 ) {
		drive_goto(val,val);
	}
	else if ( strcmp(cmdbuf,"rampUp") == 0 && ( strcmp(lastcmdbuf,"rampUp") == 0 || strcmp(lastcmdbuf,"rampDown") == 0 ) ) {
		drive_rampStep(128, 128);   // Forward
	}
	else if ( strcmp(cmdbuf,"rampUp") == 0   ) {
     drive_ramp(0,0);
		drive_rampStep(128, 128);   // Forward
	}
	else if ( strcmp(cmdbuf,"down") == 0 ) {
		drive_goto(-val,-val);
	}
	else if ( strcmp(cmdbuf,"rampDown") == 0 && ( strcmp(lastcmdbuf,"rampDown") == 0 || strcmp(lastcmdbuf,"rampUp") == 0) ) {
		drive_rampStep(-128, -128); // Backward
	}
	else if ( strcmp(cmdbuf,"rampDown") == 0 ) {
     drive_ramp(0,0);
		drive_rampStep(-128, -128); // Backward
	}
	else if ( strcmp(cmdbuf,"left") == 0  ) {
		int steps = val * 0.284; // convert angle into degree
		drive_goto(-steps,steps);
	}
	else if ( strcmp(cmdbuf,"rampLeft") == 0  && ( strcmp(lastcmdbuf,"rampLeft") == 0 || strcmp(lastcmdbuf,"rampRight") == 0)  ) {
		drive_rampStep(-128, 128); // Left turn
	}
	else if ( strcmp(cmdbuf,"rampLeft") == 0  ) {
     drive_ramp(0,0);
		drive_rampStep(-128, 128); // Left turn
	}
	else if ( strcmp(cmdbuf,"right") == 0  ) {
		int steps = val * 0.284; // convert angle into degree
		drive_goto(steps,-steps);
	}
	else if ( strcmp(cmdbuf,"rampRight") == 0  && ( strcmp(lastcmdbuf,"rampRight") == 0 || strcmp(lastcmdbuf,"rampLeft") == 0 ) ) {
		drive_rampStep(128, -128); // Right turn 
	}
	else if ( strcmp(cmdbuf,"rampRight") == 0  ) {
     drive_ramp(0,0);
		drive_rampStep(128, -128); // Right turn 
	}
	else if ( strcmp(cmdbuf,"slow") == 0 ) {
		drive_rampStep(0, 0);        // Slow
	}
	else if ( strcmp(cmdbuf,"stop") == 0  ) {
		drive_ramp(0, 0);        // Stop
	}
	else if ( strcmp(cmdbuf,"turet") == 0  ) {
		int dir = (val * 10) + correction;
		servo_angle(TUR, dir);
		turetHeading = val;
	}
   strcpy(lastcmdbuf,cmdbuf);
}  



/*
 * Calculates the coordinates and heading of the robot based on the ticks from the servos
 */
void calcCoordinates(void) {

	ticksLeftOld = ticksLeft;
	ticksRightOld = ticksRight;
	drive_getTicks(&ticksLeft, &ticksRight);


	int deltaTicksLeft = ticksLeft - ticksLeftOld;
	int deltaTicksRight = ticksRight - ticksRightOld;

	double deltaDistance = 0.5f * (double) (deltaTicksLeft + deltaTicksRight) * distancePerCount;
	double deltaX = deltaDistance * (double) cos(heading);
	double deltaY = deltaDistance * (double) sin(heading);
	double RadiansPerCount = distancePerCount / trackWidth;
	double deltaHeading = (double) (deltaTicksRight - deltaTicksLeft) * RadiansPerCount;

	x += deltaX;
	y += deltaY;

	heading += deltaHeading;

	// limit heading to -Pi <= heading < Pi
	if (heading > PI) {
		heading -= 2.0 * PI;
	} else {
		if (heading <= -PI) {
			heading += 2.0 * PI;
		}
	}
   degHeading = heading * (180 / PI);
  if (degHeading < 0) degHeading += 360;

}
/**
 * Continously poll the ping sensors setting the global variable pingRange0.
 * Also handles collison avoidance, stoping robot before hitting something
 */
void pollPingSensors(void *par) {

	// The directions durring a scan
	int turetDir[] = {45,67,90,112,135};

	int scanPtr = 2; // position for 90 degrees
	int directionToggle = 1;


	while(1)                                    // Repeat indefinitely
	{
		pingRange0 = ping_cm(PING);                 // Get cm distance from Ping)))

		// If we're about to run into something, stop
		//
		if ( pingRange0 < 15 ) {

			drive_speed(0, 0);  
		}     


		pause(500);                               // Wait 1 second

		// If connected, send an update
     //double degrees = heading * (180.0 / PI);
     
		if ( connected == 1 ) dprint(blue, "command=update,x=%.3f,y=%.3f,heading=%.3f,ping=%d,turet=%d,scan=%d\n", x, y, degHeading, pingRange0, turetHeading,turetScan);

		// If scan enabled, move the turet left and right
		if ( turetScan == 1 ) {


			// Change the position of the turet
			int dir = turetDir[ scanPtr ];

			executeCommand("turet",dir);
			pause(500); // Pause a second to make sure the turet is positioned


			// If the ptr is greater than the number of positions, go the other way
			if ( scanPtr + directionToggle == 5) {

				high(26);                   
				low(27);
				directionToggle = -1;
			}
			// If the ptr is less than 0, go the other way
			else if ( scanPtr + directionToggle < 0 ) {

				high(27);                   
				low(26);
				directionToggle = 1;
			}   
			else {

				high(27);                   
				high(26); 
			}                              
			scanPtr += directionToggle;
		}      
	}
}
