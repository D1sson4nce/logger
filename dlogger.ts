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
                localPath: `${Logger.defaultLogPath}/${directory}`
            })
        }
    }
}

interface Type<T> extends Function {
    new(...args: any[]): T
}

/**
 * Logs all method parameters, return value, and errors
 * @param {string[]} propertyNames if specified, any object parameter will omit all other properties from the log except the ones specified
 */
export function Log(...propertyNames: string[] | [string[]]) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let original = descriptor.value

        descriptor.value = function (...args: any[]) {
            const logger = <Logger>((this as any).__logger || Logger)

            const source = `${target.name ?? target.constructor.name}.${key}`
            const propertyKeys = propertyNames.flat()

            if (propertyKeys.length > 0) {
                const filteredArgs = args.map(a => filterObject(a, propertyKeys))

                logger.log(filteredArgs, `(${source}) arguements`)
            } else {
                logger.log(args, `(${source}) arguements`)
            }

            try {
                const result = original.apply(this, args)
                Promise.resolve(result).then((r: any) => {
                    logger.log(r, `(${source}) return`)
                }).catch(error => {
                    logger.log(error.message, `(${source}) error message`)
                    throw error
                })

                return result
            } catch (error: any) {
                logger.log(error.message, `(${source}) error message`)
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
    private logPath = Logger.defaultLogPath

    constructor(config?: Partial<config>) {
        if (config?.localPath) this.logPath = `./${config.localPath}`
    }

    static configure(config: Partial<config>) {
        this.instance = new Logger(config)
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
    localPath: string
}