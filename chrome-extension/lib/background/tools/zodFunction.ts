import { ZodSchema } from 'zod';
import { RunnableToolFunctionWithParse } from 'openai/lib/RunnableFunction';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { JSONSchema } from 'openai/lib/jsonschema';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        await delay(50);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return fn(args, runner);
      },
      name: name ?? fn.name,
      description,
      parameters: zodToJsonSchema(schema) as JSONSchema,
      parse(input: string): T {
        const obj = JSON.parse(input);
        return schema.parse(obj);
      },
    },
  };
}
