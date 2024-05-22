import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { memoryStorage } from '@chrome-extension-boilerplate/shared';

const SearchFromMemoryParams = z.object({
  keyword: z.string(),
});

async function searchFromMemory(params: z.infer<typeof SearchFromMemoryParams>) {
  const memory = await memoryStorage.queryMemory(params.keyword);
  return { success: true, memory };
}

const RemoveMemoryParams = z.object({
  id: z.string(),
});

async function removeMemory(params: z.infer<typeof RemoveMemoryParams>) {
  await memoryStorage.removeMemory(params.id);
  return { success: true };
}

const UpdateMemoryParams = z.object({
  id: z.string(),
  value: z.string(),
});

async function updateMemory(params: z.infer<typeof UpdateMemoryParams>) {
  await memoryStorage.updateMemory(params.id, params.value);
  return { success: true };
}

const AddMemoryParams = z.object({
  value: z.string(),
});

async function addMemory(params: z.infer<typeof AddMemoryParams>) {
  await memoryStorage.addMemory(params.value);
  return { success: true };
}

export const memoryTools = [
  zodFunction({
    function: searchFromMemory,
    schema: SearchFromMemoryParams,
    description: 'Search the memory with the given keyword.',
  }),
  zodFunction({
    function: removeMemory,
    schema: RemoveMemoryParams,
    description: 'Remove the memory with the given id.',
  }),
  zodFunction({
    function: updateMemory,
    schema: UpdateMemoryParams,
    description: 'Update the memory with the given id.',
  }),
  zodFunction({
    function: addMemory,
    schema: AddMemoryParams,
    description: 'Add the memory with the given value.',
  }),
];
