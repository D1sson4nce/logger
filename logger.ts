import * as fs from 'fs'

/**
 * Logs all method parameters and return value
 * @param {string[]} propertyNames if specified, any object parameter will omit all other properties from the log except the ones specified
 */
export function Log(...propertyNames: string[] | [string[]]) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let original = descriptor.value

        descriptor.value = function (...args: any[]) {
            const source = `${target.name ?? target.constructor.name}.${key}`
            const propertyKeys = propertyNames.flat()

            if (propertyKeys.length > 0) {
                const filteredArgs = args.map(a => filterObject(a, propertyKeys))

                Logger.log(filteredArgs, `(${source}) arguements`)
            } else {
                Logger.log(args, `(${source}) arguements`)
            }

            const result = Promise.resolve(original.apply(this, args)).then((r: any) => {
                Logger.log(r, `(${source}) return`)
            })

            return result
        }
    }
}

function filterObject(obj: Record<string, any>, propertyKeys: string[]) {
    if (typeof obj != "object") return obj
    return propertyKeys.reduce((r, k) => {
        const [key, ...rest] = k.split(".")
        const nested = rest.join(".")
        if (nested) {
            r[key] = {
                ...r[key],
                ...filterObject(obj[key], [nested])
            }
        } else {
            r[key] = obj[key]
        }

        return r
    }, <Record<string, any>>{})

    const groupedKeys = propertyKeys.reduce((r, c) => {
        const [topKey, ...rest] = c.split(".")
        const restKey = rest.join(".")
        if (!r[topKey]) r[topKey] = []
        if (restKey) r[topKey].push(restKey)
        return r
    }, <Record<string, string[]>>{})

    const result: Record<string, any> = {};

    for (const key of Object.keys(groupedKeys)) {
        if (groupedKeys[key].length > 0) {
            result[key] = filterObject(obj[key], groupedKeys[key]);
        } else {
            result[key] = obj[key];
        }
    }

    return result
}

export class Logger {
    private static instance = new Logger()
    private logPath = "./log"

    static configure(config: Partial<config>) {
        this.instance = new Logger()

        if (config.localPath) this.instance.logPath = `./${config.localPath}`
    }

    static log(obj: Object, pretext?: string) {
        if (pretext) {
            this.instance.writeLine(`${pretext}: ${JSON.stringify(obj)}`)
            return
        }
        this.instance.writeLine(JSON.stringify(obj))
    }

    private writeLine(line: string) {
        const dateTime = this.dateTime

        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath)
        }

        fs.appendFile(`${this.logPath}/${this.date}.txt`, `[${dateTime}] ${line}\n`, () => { })
    }

    private get date() {
        const date = new Date()
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    }

    private get time() {
        const date = new Date()
        return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    }

    private get dateTime() {
        return `${this.date} ${this.time}`
    }
}

type config = {
    localPath: string
}