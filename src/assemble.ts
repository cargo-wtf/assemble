/**
 * @module
 *
 * With Cargo Assemble you get a simple and light dependency injection container
 * for your project. Its straight forward to use and is suitable for simple use
 * cases like the following:
 * ```ts
 * import { Factory } from "jsr:@cargo/assemble";
 *
 * const DI = new Factory();
 *
 * class GreetingService {
 *    greet(value string) {
 *      return value;
 *    }
 * }
 * DI.assemble({
 *   class: GreetingService
 * });
 *
 * DI.get(GreetingService);
 * ```
 */

type ItemToAssemble = ToAssemble<unknown> & {
  type: Injectable;
  value?: unknown;
};

type Newable<T> = {
  new (...args: any[]): T;
};

type Callable<T> = (...args: any[]) => T;

type Injectable =
  | string
  | Newable<unknown>
  | Callable<unknown>;

/**
 *  Input for {@link Factory.assemble} to register a class
 */
export interface ClassToAssemble<T> {
  /** The class to be constructed by Assemble */
  class: Newable<T>;
  /**
   * Whether of not the class should be handled as a singleton instance (e.q. only exists once).
   * @default true
   */
  isSingleton?: boolean;
  /**
   * The dependencies of the class as {@link Injectable[]} tokens
   */
  dependencies?: Injectable[];
}

/**
 *  Input for {@link Factory.assemble} to register a token based value
 */
export interface ValueToAssemble<T> {
  token: string;
  value: T;
}

/**
 *  Input for {@link Factory.assemble} to register a pure function
 */
export interface FunctionToAssemble<T> {
  function: Callable<T>;
  dependencies?: Injectable[];
}

/**
 * Allowed input types for the {@link Factory.assemble} function
 *  Types: {@link ClassToAssemble},{@link ValueToAssemble},{@link FunctionToAssemble}
 */
export type ToAssemble<T> =
  | ClassToAssemble<T>
  | FunctionToAssemble<T>
  | ValueToAssemble<T>;

type ReturnValue<A extends Injectable, T> = A extends string
  ? ValueToAssemble<T>["value"]
  : (A extends (...args: any) => any ? ReturnType<A>
    : (A extends new (...args: any[]) => infer R ? R : never));

export type Registery = ItemToAssemble[];

/**
 * Factory to manage the dependency injection tasks
 * @class
 */
export class Factory {
  #registry: ItemToAssemble[] = [];
  #singletons = new Map<Injectable, unknown>();

  /**
   * Retrieve an instance of the requested injection token {@link Injectable}.
   * @method
   * @param {Injectable}
   */
  get<T, A extends Injectable = string>(
    token: A,
  ): ReturnValue<A, T> {
    let injectable = this.#registry.find((item) => {
      return item.type === token;
    });

    const errMsg =
      `Provided token: "${token.toString()}" is not registered for dependency injection`;

    if (!injectable) {
      if (
        typeof token === "function" &&
        Symbol.metadata in token &&
        token[Symbol.metadata] &&
        Array.isArray(token[Symbol.metadata]![ASSEMBLE_METADATA_KEY])
      ) {
        const dependencies =
          <Injectable[]> token[Symbol.metadata]![ASSEMBLE_METADATA_KEY];
        this.assemble({ class: <Newable<unknown>> token, dependencies });
      }
      injectable = this.#registry.find((item) => {
        return item.type === token;
      });
      if (!injectable) {
        throw new Error(errMsg);
      }
    }

    if ("class" in injectable) {
      if (injectable.isSingleton !== false) {
        const item = this.#singletons.get(injectable.type);
        if (item) return <ReturnValue<A, T>> item;
      }
      const deps: unknown[] = injectable.dependencies?.map((toInject) =>
        this.get(toInject)
      ) ?? [];

      const item = <ReturnValue<A, T>> new injectable.class(...deps);

      if (injectable.isSingleton !== false) {
        this.#singletons.set(
          injectable.type,
          item,
        );
      }

      return item;
    }

    if ("function" in injectable) {
      const deps: unknown[] = injectable.dependencies?.map((toInject) => {
        return this.get(toInject);
      }) ?? [];

      return <ReturnValue<A, T>> injectable.function(...deps);
    }

    if ("token" in injectable) {
      return <ReturnValue<A, T>> injectable.value;
    }

    throw new Error(errMsg);
  }

  /**
   * Register an object to be assembled by the Factory
   * @method
   * @param {ToAssemble}
   */
  assemble<T>(toAssemble: ToAssemble<T>) {
    if ("class" in toAssemble) {
      this.#registry.push({
        type: toAssemble.class,
        ...toAssemble,
      });
      return;
    }
    if ("token" in toAssemble) {
      this.#registry.push({
        type: toAssemble.token,
        ...toAssemble,
      });
      return;
    }
    if ("function" in toAssemble) {
      this.#registry.push({
        type: toAssemble.function,
        ...toAssemble,
      });
      return;
    }
  }
}

const ASSEMBLE_METADATA_KEY = "cargo:assemble:deps";

/**
 * Decorator to add the dependency metadata to a class. The decorated class can
 * be used directly with the {@link Factory.get} method. Without the need
 * to register the class with {@link Factory.assemble} beforehand.
 */
export function assemble<T>(
  options?: {
    deps?: unknown[];
  },
): (target: T, context: ClassDecoratorContext) => T {
  return function (
    target: T,
    context: ClassDecoratorContext,
  ) {
    if (context.kind) {
      context.metadata[ASSEMBLE_METADATA_KEY] = [
        ...(options?.deps ? options.deps : []),
      ];
    }
    return target;
  };
}
