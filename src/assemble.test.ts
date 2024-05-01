import { assemble, Factory } from "./assemble.ts";
import { assertEquals } from "@std/assert/assert-equals";
import { assertNotStrictEquals } from "@std/assert/assert-not-strict-equals";
import { assertStrictEquals } from "@std/assert/assert-strict-equals";

Deno.test(`should return a expected value`, () => {
  const DI = new Factory();
  DI.assemble({
    token: "hello",
    value: "world",
  });

  assertEquals(DI.get("hello"), "world");
});

Deno.test("should return valid class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.assemble({
    class: Hello,
  });

  assertEquals((DI.get(Hello)).say(), "world");
});

Deno.test("should return singleton class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.assemble({
    class: Hello,
  });

  const a = DI.get(Hello);
  const b = DI.get(Hello);

  assertStrictEquals(a, b);

  assertEquals(a.say(), "world");
  assertEquals(b.say(), "world");
});

Deno.test("should return own class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.assemble({
    class: Hello,
    isSingleton: false,
  });

  const a = DI.get(Hello);
  const b = DI.get(Hello);

  assertNotStrictEquals(a, b);

  assertEquals(a.say(), "world");
  assertEquals(b.say(), "world");
});

Deno.test("should return valid class instance with deps", () => {
  const DI = new Factory();
  DI.assemble({ token: "value", value: "univers" });

  class Hello2 {
    constructor(private readonly value: string) {
    }
    say() {
      return this.value;
    }
  }
  DI.assemble({
    class: Hello2,
    isSingleton: true,
    dependencies: ["value"],
  });

  assertEquals((DI.get(Hello2)).say(), "univers");
});

Deno.test("should return valid class instance with nested deps", () => {
  const DI = new Factory();
  DI.assemble({
    token: "newValue",
    value: "galaxy",
  });
  class HelloService {
    constructor(private readonly value: string) {
    }
    say() {
      return this.value;
    }
  }

  DI.assemble({ class: HelloService, dependencies: ["newValue"] });

  class Hello3 {
    constructor(private readonly helloService: HelloService) {
    }
    say() {
      return this.helloService.say();
    }
  }
  DI.assemble({
    class: Hello3,
    dependencies: [HelloService],
  });

  assertEquals((DI.get(Hello3)).say(), "galaxy");
});

Deno.test("should return function result based on deps", () => {
  const DI = new Factory();
  DI.assemble({
    token: "hey",
    value: "ho",
  });

  function say(hello: string) {
    return hello;
  }

  DI.assemble({ function: say, dependencies: ["hey"] });

  assertEquals(DI.get(say), "ho");
});

Deno.test("should return decorated class with deps", () => {
  @assemble()
  class B {
    constructor(h: string) {}

    prefix(v: string): string {
      return `B: ${v}`;
    }
  }

  @assemble({
    deps: [B, "PREFIX"],
  })
  class A {
    constructor(private prefixer: B, private prefixValue: string) {}

    prefix(v: string): string {
      return this.prefixer.prefix(`${this.prefixValue} ${v}`);
    }
  }

  const DI = new Factory();

  DI.assemble({
    token: "PREFIX",
    value: "prefixed value:",
  });
  DI.assemble(A);
  DI.assemble(B);

  assertEquals(DI.get(B).prefix("works"), "B: works");
  assertEquals(DI.get(A).prefix("works"), "B: prefixed value: works");
});
