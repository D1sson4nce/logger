import { Log } from "..";

export class Test {
    @Log(["fornite"])
    test(name: string, age: number, obj?: any) {
        return `${name}: ${age}`
    }
}

