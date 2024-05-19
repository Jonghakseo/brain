import { ZodSchema } from 'zod';
import { RunnableToolFunctionWithParse } from 'openai/lib/RunnableFunction';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { JSONSchema } from 'openai/lib/jsonschema';
import { delay } from '@chrome-extension-boilerplate/shared';

/**
 * A generic utility function that returns a RunnableFunction
 * you can pass to `.runTools()`,
 * with a fully validated, typesafe parameters schema.
 *
 * You are encouraged to copy/paste this into your codebase!
 */
export function zodFunction<T extends object>({
  function: fn,
  schema,
  description = '',
  name,
}: {
  function: (args: T) => Promise<object>;
  schema: ZodSchema<T>;
  description?: string;
  name?: string;
}): RunnableToolFunctionWithParse<T> {
  return {
    type: 'function',
    function: {
      function: async (args, runner) => {
        // Add a small delay prevent concurrent issues
        await delay(100);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return fn(args, runner);
      },
      name: name ?? fn.name,
      description,
      parameters: removeSomeFields(zodToJsonSchema(schema)) as JSONSchema,
      parse(input: string): T {
        try {
          const obj = JSON.parse(input);
          return schema.parse(obj);
        } catch (e) {
          throw new Error(`Invalid ${name ?? fn.name} tool params: ${e}`);
        }
      },
    },
  };
}

const removeSomeFields = (obj: unknown) => {
  const target = JSON.parse(JSON.stringify(obj));
  const deleteProperties = [
    // 'additionalProperties',
    '$schema',
    // 'maximum',
    // 'minimum',
    // 'default',
    // 'minItems',
    // 'exclusiveMinimum',
  ];
  const removeProperties = (_obj: Record<string, unknown>) => {
    for (const key in _obj) {
      if (deleteProperties.includes(key)) {
        delete _obj[key];
      } else if (typeof _obj[key] === 'object') {
        removeProperties(_obj[key] as Record<string, unknown>);
      }
    }
  };

  removeProperties(target);

  return target;
};
