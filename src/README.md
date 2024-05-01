# Cargo Assemble - Simple and Light Dependency Injection

With Cargo Assemble you get a simple and light dependency injection container
for your project. Its straight forward to use and is suitable for simple use
cases like the following:

## Register simple values:

```ts
import { Factory } from "jsr:@cargo/assemble";

// Register simple value and make it available in Cargo Assemble
const DI = new Factory();
DI.assemble({
  token: "hello",
  value: "world",
});

// Get value from Cargo Assemble via token
DI.get("hello");
```

## Register class including its dependencies:

```ts
import { Factory } from "jsr:@cargo/assemble";

const DI = new Factory();
// Create and register class without dependencies
class GreetingService {
	greet(value string) {
		return value;
	}
}
DI.assemble({
	class: GreetingService
})

// Create and register class with dependencies
class ServiceB {
	constructor(
		private readonly greetingService: GreetingService,
		private readonly value: string
	){}
	
	greet() {
		this.greetingService.greet()
	}
}

/*
 * Note the second dependency in the array. This is a reference to the value 
 * registered in the first example.
 */
DI.assemble({
	class: ServiceB,
	dependencies: [GreetingService,'hello'],
})

DI.get(ServiceB).say() // returns "world"
```

## Register class including its dependencies:

```ts
import { Factory } from "jsr:@cargo/assemble";
const DI = new Factory();

function say(serviceB: ServiceB) {
  return serviceB.say();
}

// We handover the class from the previous example as a dependency
DI.assemble({
  function: say,
  dependencies: [ServiceB],
});

DI.get(say); // returns "world"
```

## Limits

### Circular Dependencies

Be careful with linking dependencies of Cargo Assemble managed object. If two
object referencing each other it will try inject recursively, which will lead to
`RangeError: Maximum call stack size exceeded` error.
