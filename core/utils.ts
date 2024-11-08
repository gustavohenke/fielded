/**
 * Utility to remove the readonly flags from a type `T`
 */
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

/**
 * Utility type to check whether `A` is `never`, and if it's, fallback to `B` instead.
 *
 * @see https://stackoverflow.com/a/58978075/2083599
 */
export type Either<A, B> = [A] extends [never] ? B : A;
