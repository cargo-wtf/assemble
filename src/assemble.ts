const registry: ItemToAssemble[] = [];

const items = new Map<Injectable, unknown>();

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

export function assemble<T>(toAssemble: ToAssemble<T>) {
  if ("class" in toAssemble) {
    registry.push({
      type: toAssemble.class,
      ...toAssemble,
    });
  }
  if ("token" in toAssemble) {
    registry.push({
      type: toAssemble.token,
      ...toAssemble,
    });
  }
  if ("function" in toAssemble) {
    registry.push({
      type: toAssemble.function,
      ...toAssemble,
    });
  }
}

type ReturnValue<A extends Injectable, T> = A extends string
  ? ValueToAssemble<T>["value"]
  : (A extends (...args: any) => any ? ReturnType<A>
    : (A extends new (...args: any[]) => infer R ? R : never));

export function get<T, A extends Injectable = string>(
  token: A,
): ReturnValue<A, T> {
  const injectable = registry.find((item) => {
    return item.type === token;
  });

  const errMsg =
    `Provided token: "${token.toString()}" is not registered for dependency injection`;

  if (!injectable) {
    throw new Error(errMsg);
  }

  if ("class" in injectable) {
    if (injectable.isSingleton !== false) {
      const item = items.get(injectable.type);
      if (item) return <ReturnValue<A, T>> item;
    }
    const deps: unknown[] = injectable.dependencies?.map((toInject) =>
      get(toInject)
    ) ?? [];

    const item = <ReturnValue<A, T>> new injectable.class(...deps);

    if (injectable.isSingleton !== false) items.set(injectable.type, item);

    return item;
  }

  if ("function" in injectable) {
    const deps: unknown[] = injectable.dependencies?.map((toInject) => {
      return get(toInject);
    }) ?? [];

    return <ReturnValue<A, T>> injectable.function(...deps);
  }

  if ("token" in injectable) {
    return <ReturnValue<A, T>> injectable.value;
  }

  throw new Error(errMsg);
}

export function Assemble(toAssemble: ToAssemble<unknown>[]): void {
  if (Array.isArray(toAssemble)) {
    for (const item of toAssemble) {
      assemble(item);
    }
  }
}
