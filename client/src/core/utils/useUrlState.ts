import { useSearchParams } from "react-router-dom";
import { useCallback, useRef, useEffect } from "react";

/**
 * Options for configuring useUrlState.
 */
interface UseUrlStateOptions<T> {
  /**
   * Serializes the state value into a string for the URL search parameter.
   */
  serialize?: (val: T) => string;
  /**
   * Deserializes the URL search parameter string back into the state value.
   */
  deserialize?: (str: string) => T;
  /**
   * If true, navigates by replacing the history entry.
   * If false, pushes a new entry into history (enabling Browser Back support).
   */
  replace?: boolean;
}

/**
 * Synchronizes component state with a URL query parameter using React Router search parameters.
 *
 * @param key The URL query parameter key.
 * @param defaultValue The default state value.
 * @param options Optional configuration for custom serialization, deserialization, and navigation behavior.
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options?: UseUrlStateOptions<T>
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const serialize = options?.serialize ?? ((val: any) => String(val));
  const deserialize = options?.deserialize ?? ((str: string) => str as unknown as T);
  const replace = options?.replace ?? false;

  // Store options, callbacks and defaults in refs to stabilize setValue reference
  const serializeRef = useRef(serialize);
  const deserializeRef = useRef(deserialize);
  const defaultValueRef = useRef(defaultValue);
  const replaceRef = useRef(replace);

  useEffect(() => {
    serializeRef.current = serialize;
    deserializeRef.current = deserialize;
    defaultValueRef.current = defaultValue;
    replaceRef.current = replace;
  });

  // Retrieve value from current search params, fallback to default value
  const paramVal = searchParams.get(key);
  const value = paramVal !== null ? deserialize(paramVal) : defaultValue;

  const setValue = useCallback(
    (newValueOrUpdater: T | ((prev: T) => T)) => {
      setSearchParams(
        (prevParams) => {
          const nextParams = new URLSearchParams(prevParams);
          const currentParamVal = prevParams.get(key);
          const currentVal = currentParamVal !== null 
            ? deserializeRef.current(currentParamVal) 
            : defaultValueRef.current;

          const resolvedValue =
            typeof newValueOrUpdater === "function"
              ? (newValueOrUpdater as Function)(currentVal)
              : newValueOrUpdater;

          // Helper to check if value matches default
          const isValueDefault = (val: any, def: any): boolean => {
            if (val === def) return true;
            if (Array.isArray(val) && Array.isArray(def)) {
              if (val.length !== def.length) return false;
              return val.every((item, index) => item === def[index]);
            }
            return false;
          };

          const isDefault =
            resolvedValue === null ||
            resolvedValue === undefined ||
            resolvedValue === "" ||
            (Array.isArray(resolvedValue) && resolvedValue.length === 0) ||
            isValueDefault(resolvedValue, defaultValueRef.current);

          if (isDefault) {
            nextParams.delete(key);
          } else {
            nextParams.set(key, serializeRef.current(resolvedValue));
          }

          return nextParams;
        },
        { replace: replaceRef.current }
      );
    },
    [key, setSearchParams]
  );

  return [value, setValue] as const;
}
