# README
dlogger is a primitive decorator logger for TypeScript

## tsconfig
To use this package, you need to activate experimentalDecorators, and emitDecoratorMetadata in the tsconfig.jsoon file
```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,       
    }
}
```

## Usage

### Configure

Use Logger.configure to set settings for the static instance of the logger. decoator logs will also use these settings.
```typescript
Logger.configure({
    instanceBased: false //if set to true. behavior of your logger object will be relative the static logger. default: false
    localPath: "log" //path within it will make files. default: "log"
    timer: true //time method calls. default: false
})
```

You can also make logger instances with their own settings.
```typescript
const logger = new Logger({
    "localPath": "custom-log"
})
```

### Log

To log, simply use Logger.log
The log method takes an object, and can also take an extra object as pretext for said object.
```typescript
const dog = { name: "Fido", age: 7, breed: "Golden" }
Logger.log(dog, "Dog info")
/*
[2026-04-10 16:15:38] Dog info: { name: 'Fido', age: 7, breed: 'Golden' }
*/
```

For logging for decorators, add the @Log decorator to any method
```typescript
class User {
    @Log()
    createPost(data: { post: { title: string, content: string }, foo: string }) {
        // const success = DB.doSomething(post)
        return true
    }
}

const user = new User()
user.createPost({ post: { title: "this logger kinda sucks", content: "I'm not a fan" }, foo: "bar" })
/*
[2026-04-10 16:45:55] [0] (User.createPost) arguements: [
  {
    post: { title: 'this logger kinda sucks', content: "I'm not a fan" },
    foo: 'bar'
  }
]
[2026-04-10 16:45:55] [0] (User.createPost) return: true
[2026-04-10 16:45:55] [0] (User.createPost) Elapsed time (ms): 0.07510018348693848
*/
```

If you only want to log a specific arguement property, you specify it in the decorator 
```typescript
@Log("post")
createPost(data: { post: { title: string, content: string }, foo: string })
/*
[2026-04-10 16:49:12] [0] (User.createPost) arguements: [
  {
    post: { title: 'this logger kinda sucks', content: "I'm not a fan" }
  }
]
*/

@Log("post.title", "foo")
createPost(data: { post: { title: string, content: string }, foo: string })
/*
[2026-04-10 16:51:37] [0] (User.createPost) arguements: [ { post: { title: 'this logger kinda sucks' }, foo: 'bar' } ]
*/
```

### Sub dicrectory

if you want logs to go into sub directories, there's a call decorator that can do that.
Just add the @Logged decorator to a class
```typescript
@Logged("users")
class User {
}

//Logs from this class will end up in /logs/users
```