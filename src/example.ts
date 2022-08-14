// npm ci
// npx ts-node ./src/example

import { Cron, CronTick } from "./cron"

const c = new Cron("* * * * *", (t: CronTick, i: Date) => {
    console.log("Tick", t);
    console.log("Instance", i);
}, "Europe/London");

c.start();