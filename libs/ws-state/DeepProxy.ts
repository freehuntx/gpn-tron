type Target = Record<any, any>;

export class DeepProxy {
  #preproxy: WeakMap<object, Target>;
  #handler: any;

  constructor(target: Target, handler: object) {
    this.#preproxy = new Map();
    this.#handler = handler;
    return this.proxify(target, []) as DeepProxy;
  }

  makeHandler(path: string[]) {
    let dp = this;
    return {
      set(target: Target, key: string, value: any, receiver: Target) {
        if (typeof value === 'object') {
          value = dp.proxify(value, [...path, key]);
        }

        if (dp.#handler.set) {
          const result = dp.#handler.set(
            target,
            [...path, key],
            value,
            receiver
          );
          if (result !== undefined) return result;
        }

        target[key] = value;

        return true;
      },

      deleteProperty(target: Target, key: string) {
        if (Reflect.has(target, key)) {
          dp.unproxy(target, key);

          if (dp.#handler.deleteProperty) {
            const result = dp.#handler.deleteProperty(target, [...path, key]);
            if (result !== undefined) return result;
          }

          return Reflect.deleteProperty(target, key);
        }
        return false;
      },
    };
  }

  unproxy(obj: Target, key: string) {
    if (this.#preproxy.has(obj[key])) {
      obj[key] = this.#preproxy.get(obj[key]);
      this.#preproxy.delete(obj[key]);
    }

    for (let k of Object.keys(obj[key])) {
      if (typeof obj[key][k] === 'object') {
        this.unproxy(obj[key], k);
      }
    }
  }

  proxify(obj: Target, path: string[]) {
    for (let key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        obj[key] = this.proxify(obj[key], [...path, key]);
      }
    }
    let p = new Proxy(obj, this.makeHandler(path));
    this.#preproxy.set(p, obj);
    return p;
  }
}
