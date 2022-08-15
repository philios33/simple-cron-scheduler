
export type CronSchedule = {
    minutes: Array<number>
    hours: Array<number>
    days: Array<number>
    months: Array<number>
    dows: Array<number>
}

export function parseCronSchedule(schedule: string) : CronSchedule {
    const cronPieces = schedule.split(" ");
    if (cronPieces.length !== 5) {
        throw new Error("Cron schedule syntax must contain 5 settings split by the space character");
    }
    return {
        minutes: parseCronPiece(cronPieces[0], 0, 59),
        hours: parseCronPiece(cronPieces[1], 0, 23),
        days: parseCronPiece(cronPieces[2], 1, 31),
        months: parseCronPiece(cronPieces[3], 1, 12),
        dows: parseCronPiece(cronPieces[4], 0, 6),
    }
}

export function parseCronPiece(piece: string, minValue: number, maxValue: number) : Array<number> {
    let values: Array<number> = [];

    // If the minValue is 0, the value can be modded (%) by maxValue + 1 for safety reasons
    const modValue: null | number = minValue === 0 ? maxValue + 1 : null;

    const pushToValues = (i: number) => {
        if (modValue !== null) {
            values.push(i % modValue);
        } else {
            if (i >= minValue && i <= maxValue) {
                values.push(i);
            }
        }
    }

    // Split by "," since you can specify many items in a single cron piece
    const items = piece.split(",");
    for (const item of items) {
        if (item === "*") {
            for (let i=minValue; i<=maxValue; i++) {
                pushToValues(i);
            }
            break;
        }

        const rangeRegExp = /^(\d+)\-(\d+)$/
        const rangePieces = rangeRegExp.exec(item);
        if (rangePieces) {
            const fromRange = parseInt(rangePieces[1]);
            const toRange = parseInt(rangePieces[2]);
            if (fromRange <= toRange) {
                for (let i=fromRange; i<=toRange; i++) {
                    pushToValues(i);
                }
            }
            break;
        }

        const rangeWithStepRegExp = /^(\d+)\-(\d+)\/(\d+)$/
        const rangeWithStepPieces = rangeWithStepRegExp.exec(item);
        if (rangeWithStepPieces) {
            const fromRange = parseInt(rangeWithStepPieces[1]);
            const toRange = parseInt(rangeWithStepPieces[2]);
            const stepSize = parseInt(rangeWithStepPieces[3]);
            if (fromRange <= toRange) {
                for (let i=fromRange; i<=toRange; i++) {
                    if ((i - fromRange) % stepSize === 0) {
                        pushToValues(i);
                    }
                }
            }
            break;
        }

        const stepRegExp = /^\*\/(\d+)$/
        const stepResult = stepRegExp.exec(item);
        if (stepResult) {
            const everyX = parseInt(stepResult[1]);
            for (let i=0; i<maxValue; i++) {
                if (i % everyX === 0) {
                    pushToValues(i);
                }
            }
            break;
        }

        const normalValueRegExp = /^(\d+)$/
        const normalValueResult = normalValueRegExp.exec(item);
        if (normalValueResult) {
            const value = parseInt(normalValueResult[1]);
            if (value >= minValue || value <= maxValue) {
                pushToValues(value);
            } else {
                throw new Error("Out of range cron value: " + value + " should be min: " + minValue + " and max: " + maxValue);
            }
        } else {
            throw new Error("Could not parse cron value: " + item);
        }
    }

    // Remove duplicates and sort
    const uniqueValues = [...new Set(values)];
    uniqueValues.sort();
    return uniqueValues;
}
