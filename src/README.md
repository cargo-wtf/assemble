# Cargo Assemble - Simple and Light Dependency Injection

With Cargo Assemble you get a simple and light dependency injection container
for your project. Its straight forward to use and is suitable for simple use
cases like the following:

## Register simple values:

```ts
import { assemble, get } from "jsr:@cargo/assemble";

// Register simple value and make it available in Cargo Assemble
assemble({
  token: "hello",
  value: "world",
});

// Get value from Cargo Assemble via token
get("hello");
```

## Register class including its dependencies:

```ts
import { assemble } from "https://deno.land/x/cargo_assemble";

// Create and register class without dependencies
class GreetingService {
	greet(value string) {
		return value;
	}
}
assemble({
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
assemble({
	class: ServiceB,
	dependencies: [GreetingService,'hello'],
})

get(ServiceB).say() // returns "world"
```

## Register class including its dependencies:

```ts
import { assemble } from "https://deno.land/x/cargo_assemble";

function say(serviceB: ServiceB) {
  return serviceB.say();
}

// We handover the class from the previous example as a dependency
assemble({
  function: say,
  dependencies: [ServiceB],
});

get(say); // returns "world"
```

## Limits

### Circular Dependencies

Be careful with linking dependencies of Cargo Assemble managed object. If two
object referencing each other it will try inject recursively, which will lead to
`RangeError: Maximum call stack size exceeded` error.
