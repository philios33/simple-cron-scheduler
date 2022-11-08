/**
 * After being appalled by the quality of existing cron packages on npm, I decided to write my own.  This is a simple cron based function scheduler.
 * The function runs at the time(s) you specify in the schedule.
 * See https://crontab.guru/ for valid crontab syntax.
 * It does NOT needlessly support second granularity.  If you need to run something every second, you should not use this cron library.
 * There are no events emmitted and no Job object.  The cron is simply created and started, and optionally cancelled when necessary.
 * I have avoided arbitrary wait values such as setInterval(---, 500); as I consider this an antipattern.
 * Does NOT use globals
 * Does NOT use uuid to keep track of Jobs needlessly, the cron instance is simply stored in memory.
 * Code is not illegible.
 * Code is efficient (small resource footprint)
 * Code is lightweight (small size footprint circa 200 lines)
 * Each cron runs synchronously but executes the target function outside of the main loop.
 * Whether the execution function returns a promise or not is irrelevant.  The cron system doesn't ever wait.
 * No locking.  The cron system doesn't prevent duplicate execution if a function takes a long time to execute.
 * Intl.DateTimeFormat is used to support timezones.  No confusing utcOffset.
 * No confusing errors such as: "cron reached maximum iterations".  A cron cannot reach a maximum number of iterations.
 * Uses a smaller, clearer and cleaner cron schedule string parser than can be found in any of: cron-parser, cron, node-cron packages.
 * Does not support supplying Dates.  This is a cron library, not a scheduler.
 * Once and only once.  Ticks are designed to guarantee eventual execution and never be missed even on a slowly executing or throttled node process.
 */

import { CronSchedule, parseCronSchedule } from "./cronSchedule"

export type CronTick = {
    minute: number
    hour: number
    day: number
    month: number
    dow: number
}

export class Cron {

    private schedule: CronSchedule
    private executeFunc: (time: CronTick, instance: Date) => void
    private dtf: null | Intl.DateTimeFormat
    private lastDateExecuted: Date
    private isCancelled: boolean
    private isStarted: boolean

    constructor(schedule: string, executeFunc: (time: CronTick, instance: Date) => void | Promise<any>, timezone?: string) {
        this.schedule = parseCronSchedule(schedule);
        this.executeFunc = executeFunc;
        this.lastDateExecuted = new Date();
        this.isCancelled = false;
        this.isStarted = false;

        this.dtf = null;
        if (timezone) {
            this.dtf = new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                // hourCycle: 'h23', // This is not compiling with target=es6
                timeZone: timezone
            });
        }
    }

    start() {
        if (this.isStarted) {
            throw new Error("Already started");
        }
        this.isStarted = true;
        
        // Doing an interval every second is inefficient!
        // We can calculate when the first change will be and start a minute interval from then.
        const now = new Date();
        const currentSecond = now.getSeconds(); // 0 - 59
        if (currentSecond < 2) {
            // Close enough to the tick that just happened
            // console.log("Close enough: " + currentSecond);
            this.startFirstExecution();
        } else {
            // console.log("Waiting: " + (60 - currentSecond));
            setTimeout(() => {
                this.startFirstExecution();
            }, (60 - currentSecond) * 1000);
        }
    }

    private startFirstExecution() {
        if (this.isCancelled) {
            return;
        }
        this.lastDateExecuted = new Date();
        this.lastDateExecuted.setSeconds(0);
        this.lastDateExecuted.setMilliseconds(0);
        // We go back to the start of the previous minute so that we trigger the next minute now
        this.lastDateExecuted.setMinutes(this.lastDateExecuted.getMinutes() - 1);
        // console.log("First execution starting, setting lastDateExecuted to", this.lastDateExecuted);
        const interval = setInterval(() => {
            if (this.isCancelled) {
                clearInterval(interval);
                return;
            }
            this.runCronStepsToNow();
        }, 60 * 1000);  // There is no need to make an interval any less often than 60 seconds
        this.runCronStepsToNow();
    }

    private runCronStepsToNow() {
        // Send all the minute steps since the previous launch to the system
        // We can do this by increasing a date with 60 seconds intervals
        const now = new Date(); 
        // This should always execute at the start of a new minute
        // but we still need to make sure we dont run the next tick prematurely
        while (this.lastDateExecuted <= now) {
            const nextTickTime = new Date(this.lastDateExecuted);
            nextTickTime.setMinutes(nextTickTime.getMinutes() + 1); // Add 1 minute
            if (nextTickTime > now) {
                // Not reached this tick yet
                break;
            }

            this.lastDateExecuted = nextTickTime;
            // It is not possible for a minute to get skipped or duplicated
            
            let localTime = this.lastDateExecuted;
            if (this.dtf !== null) {
                localTime = new Date(this.dtf.format(this.lastDateExecuted));
            }

            const thisTick: CronTick = {
                minute: localTime.getMinutes(),
                hour: localTime.getHours(),
                day: localTime.getDate(),
                month: localTime.getMonth() + 1,
                dow: localTime.getDay(),
            }
            this.executeTick(thisTick, this.lastDateExecuted);
        }
    }

    private executeTick(tick: CronTick, instance: Date) {
        // console.log("Executing tick", tick, instance);
        // Only execute the tick when the schedule says so
        if (this.schedule.minutes.indexOf(tick.minute) === -1) {
            return;
        }
        if (this.schedule.hours.indexOf(tick.hour) === -1) {
            return;
        }
        if (this.schedule.days.indexOf(tick.day) === -1) {
            return;
        }
        if (this.schedule.months.indexOf(tick.month) === -1) {
            return;
        }
        if (this.schedule.dows.indexOf(tick.dow) === -1) {
            return;
        }

        // It is time to run the function
        try {
            this.executeFunc(tick, instance);
        } catch(e) {
            console.warn("Warning: Uncaught error inside cron executable function.");
            console.warn("The cron system doesn't care about this.");
            console.warn("Please catch errors inside the given function to handle.");
            console.warn(e);
        }
    }

    cancel() {
        if (this.isCancelled) {
            throw new Error("Already cancelled");
        }
        this.isCancelled = true;
    }
}

export default Cron;