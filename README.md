# simple-cron-scheduler

**simple-cron-scheduler** is a node.js package which allows you to schedule functions to execute at times specified by the widely used crontab syntax.  I have only focussed on including important features so that the package is lightweight.

**Please Note:** This package offers a class to be instantiated within the Node.js process.  It mimmics a real crontab, but it does not interact with the operating system or speak to the OS level crontab.  If the Node.js process dies, the scheduler dies with it and the scheduled functions wont run.

## Notable differences from similar packages

 * No seconds granularity or extension of the existing crontab syntax.  Please check your syntax at: https://crontab.guru/
 * No browser support.  You are probably doing something wrong if you're trying to install a cron library on the client side.
 * No events emitted, the function just runs.
 * No utcOffset, just specify the timezone string (uses Intl.DateTimeFormat).
 * Minimal clear code.  206 lines in total.
 * No complicated scheduler types.
 * A cron doesn't ever run out of "iterations".
 * It is not possible for a Cron execution to be "missed" or run multiple times.
 * Does not support supplying Dates.
 * Does not look ahead and report the next time that it will execute.
 * No execution locking.
 * No dependancies.

## Install

```bash
npm install simple-cron-scheduler
```

## Example

Instantiate a new cron with a schedule string, a function to execute and an optional timezone.  The timezone is used to specify which timezone the crontab schedule string should be considered to be.  If ommitted, the OS timezone will be used.  The executed function receives the exact Date object that the job was executed for, and the numeric cron tick values.  Don't forget to start the cron instance.

```javascript

import { Cron, CronTick } from "simple-cron-scheduler"

const c = new Cron("* * * * *", (t: CronTick, i: Date) => {
    console.log("Tick", t);
    console.log("Instance", i);
}, "Europe/London");

c.start();

/*

Tick { minute: 19, hour: 21, day: 14, month: 8, dow: 0 }
Instance 2022-08-14T20:19:00.000Z
Tick { minute: 20, hour: 21, day: 14, month: 8, dow: 0 }
Instance 2022-08-14T20:20:00.000Z
Tick { minute: 21, hour: 21, day: 14, month: 8, dow: 0 }
Instance 2022-08-14T20:21:00.000Z

Note: London DST = UTC + 1
*/


```


