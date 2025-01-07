import * as fs from 'fs'

export function Log(...propertyNames: string[] | [string[]]) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let original = descriptor.value

        descriptor.value = function (...args: any[]) {
            const source = `${target.name ?? target.constructor.name}.${key}`
            const propertyKeys = propertyNames.flat()

            if (propertyKeys.length > 0) {
                const properties = propertyKeys.reduce((r, c) => {
                    r[c] = args.map(a => {
                        if (typeof a != "object") return a

                        for (const cKey of c.split(".")) {
                            if (!a) return a
                            a = a[cKey]
                        }
                        return a
                    })
                    return r
                }, <Record<string, any[]>>{})

                Logger.log(properties, `(${source}) arguements`)
            } else {
                Logger.log(args, `(${source}) arguements`)
            }

            const result = original.apply(this, args)

            Logger.log(result, `(${source}) return`)

            return result
        }
    }
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
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
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