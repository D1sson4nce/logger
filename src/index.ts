import * as fs from 'fs'
import { inspect } from 'util'

/**
 * Used to put all decorator logs from this class into a sub directory. This will however use the default log path, not the one that can be set with Logger.configure 
 * @param {string | undefined} directory Name of the sub directory. If not specified, it will use the name of the class
 */
export function Logged(directory?: string) {
    return <T extends Type<Object>>(constructor: T) => {
        directory ??= constructor.name

        return class extends constructor {
            __logger = new Logger({
                instanceBased: true,
                localPath: directory
            })
        }
    }
}

interface Type<T> extends Function {
    new(...args: any[]): T
}

let callIdCounter = 0;

/**
 * Logs all method parameters, return value, and errors
 * @param {string[]} propertyNames if specified, any object parameter will omit all other properties from the log except the ones specified
 */
export function Log(...propertyNames: string[] | [string[]]) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let original = descriptor.value

        descriptor.value = function (...args: any[]) {
            const callId = callIdCounter++;
            
            const logger = <Logger>((this as any).__logger || Logger)

            const source = `${target.name ?? target.constructor.name}.${key}`
            const propertyKeys = propertyNames.flat()

            if (propertyKeys.length > 0) {
                const filteredArgs = args.map(a => filterObject(a, propertyKeys))

                logger.log(filteredArgs, `[${callId}] (${source}) arguements`)
            } else {
                logger.log(args, `[${callId}] (${source}) arguements`)
            }

            try {
                const start = performance.now()

                const result = original.apply(this, args)

                Promise.resolve(result).then((r: any) => {
                    const end = performance.now()

                    logger.log(r, `[${callId}] (${source}) return`)
                    
                    if(logger.timer) logger.log(end - start, `[${callId}] (${source}) Elapsed time (ms)`)
                }).catch(error => {
                    logger.log(error.message, `[${callId}] (${source}) error message`)
                    throw error
                })

                return result
            } catch (error: any) {
                logger.log(error.message, `[${callId}] (${source}) error message`)
                throw error
            }
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
}

export class Logger {
    static get defaultLogPath() {
        return 'log'
    }

    private static instance = new Logger()

    private instanceBased = false
    private _logPath = Logger.defaultLogPath
    private _timer = false

    get logPath(): string {
        if(this.instanceBased) return `${Logger.instance.logPath}${this._logPath.substring(1)}`
        return this._logPath
    }

    private static get timer() { return Logger.instance.timer }
    get timer(): boolean {
        console.log({
            timer: this._timer,
            instanceBased: this.instanceBased,
            instancetimer: Logger.instance._timer
        });
        
        return this._timer || this.instanceBased && Logger.instance.timer
    }

    constructor(config?: Partial<config>) {
        if (config?.localPath) this._logPath = `./${config.localPath}`
        if (config?.instanceBased) this.instanceBased = config.instanceBased
        if (config?.timer) this._timer = config.timer
    }

    static configure(config: Partial<config>) {
        this.instance = new Logger({ ...config, instanceBased: false })
    }

    /**
     * Logs the stringified version of an object
     * @param {Object} obj the object
     * @param {string | undefined} pretext text that shows before the obj, to describe it
     */
    static log(obj: Object, pretext?: string) {
        this.instance.log(obj, pretext)
    }

    /**
     * Logs the stringified version of an object
     * @param {Object} obj the object
     * @param {string | undefined} pretext text that shows before the obj, to describe it
     */
    log(obj: Object, pretext?: string) {
        if (pretext) {
            this.writeLine(`${pretext}: ${inspect(obj, { depth: Infinity })}`)
            return
        }

        this.writeLine(inspect(obj, { depth: Infinity }))
    }

    private writeLine(line: string) {
        const dateTime = this.dateTime

        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true })
        }

        fs.appendFileSync(`${this.logPath}/${this.date}.txt`, `[${dateTime}] ${line}\n`)
    }

    private get date() {
        const date = new Date()
        return this.padSingleDigit([
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        ]).join("-")
    }

    private get time() {
        const date = new Date()
        return this.padSingleDigit([
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        ]).join(":")
    }

    private padSingleDigit(arr: number[]) {
        return arr.map(n => {
            if (n > 9) return n.toString()
            return `0${n}`
        })
    }

    private get dateTime() {
        return `${this.date} ${this.time}`
    }
}

type config = {
    instanceBased: boolean //if set to true. behavior of your logger object will be relative the static logger. default: false
    localPath: string //path within it will make files. default: "log"
    timer: boolean //time method calls. default: false
}