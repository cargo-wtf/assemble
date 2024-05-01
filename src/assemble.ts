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

interface ClassToAssemble<T> {
  class: Newable<T>;
  isSingleton?: boolean;
  dependencies?: Injectable[];
}

interface ValueToAssemble<T> {
  token: string;
  value: T;
}

interface FunctionToAssemble<T> {
  function: Callable<T>;
  dependencies?: Injectable[];
}

export type ToAssemble<T> =
  | ClassToAssemble<T>
  | FunctionToAssemble<T>
  | ValueToAssemble<T>;

type ReturnValue<A extends Injectable, T> = A extends string
  ? ValueToAssemble<T>["value"]
  : (A extends (...args: any) => any ? ReturnType<A>
    : (A extends new (...args: any[]) => infer R ? R : never));

export type Registery = ItemToAssemble[];

export class Factory {
  #registry: ItemToAssemble[] = [];
  #singletons = new Map<Injectable, unknown>();

  get<T, A extends Injectable = string>(
    token: A,
  ): ReturnValue<A, T> {
    const injectable = this.#registry.find((item) => {
      return item.type === token;
    });

    const errMsg =
      `Provided token: "${token.toString()}" is not registered for dependency injection`;

    if (!injectable) {
      throw new Error(errMsg);
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

  assemble<T>(toAssemble: ToAssemble<T> | Newable<T>) {
    if (typeof toAssemble === "function") {
      const deps = Symbol.metadata in toAssemble &&
          Array.isArray(toAssemble[Symbol.metadata]![ASSEMBLE_METADATA_KEY])
        ? toAssemble[Symbol.metadata]![ASSEMBLE_METADATA_KEY]
        : undefined;

      this.#registry.push({
        type: toAssemble,
        class: toAssemble,
        dependencies: <Injectable[] | undefined> deps,
      });
      return;
    }

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

export const ASSEMBLE_METADATA_KEY = "cargo:assemble:deps";

export function assemble<T>(
  options?: {
    deps?: unknown[];
  },
): (target: T, context: ClassDecoratorContext) => T {
  return function (
    target: T,
    context: ClassDecoratorContext,
  ) {
    if (context.kind && Array.isArray(options?.deps)) {
      context.metadata[ASSEMBLE_METADATA_KEY] = [...options.deps];
    }
    return target;
  };
}
