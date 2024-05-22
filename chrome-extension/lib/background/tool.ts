import {
  billingTools,
  domTools,
  etcTools,
  memoryTools,
  programTools,
  screenTools,
  searchTools,
  settingTools,
  tabsTools,
  urlTools,
  zodFunction,
} from '@lib/background/tools';
import { z } from 'zod';
import { toolsStorage } from '@chrome-extension-boilerplate/shared';

const addCategoryIntoTools =
  <T>(tools: T[]) =>
  (categoryName: string) => {
    return tools.map(tool => ({ ...tool, category: categoryName })) as T & { category: string }[];
  };
const ALL_TOOLS_WITH_CATEGORY = [
  ...addCategoryIntoTools(settingTools)('Config'),
  ...addCategoryIntoTools(urlTools)('History & Bookmark'),
  ...addCategoryIntoTools(tabsTools)('Tab Manage & Navigation'),
  ...addCategoryIntoTools(screenTools)('Search & Screen Capture'),
  ...addCategoryIntoTools(searchTools)('Search & Screen Capture'),
  ...addCategoryIntoTools(programTools)('Programs & Macros'),
  ...addCategoryIntoTools(memoryTools)('Memory'),
  ...addCategoryIntoTools(etcTools)('ETC tools'),
  ...addCategoryIntoTools(billingTools)('OpenAI Usage'),
  ...addCategoryIntoTools(domTools)('Dom Action'),
];

// eslint-disable-next-line
// @ts-ignore
export const ALL_TOOLS = [
  ...settingTools,
  ...urlTools,
  ...tabsTools,
  ...screenTools,
  ...searchTools,
  ...programTools,
  ...etcTools,
  ...billingTools,
  ...domTools,
  ...memoryTools,
];

chrome.runtime.onInstalled.addListener(() => {
  // Resister all tools when the extension is installed
  void toolsStorage.registerTools(ALL_TOOLS_WITH_CATEGORY);
});

const allToolsNames = ALL_TOOLS.map(tool => tool.function.name) as [string, ...string[]];

const ExecuteToolParams = z.object({
  toolName: z.enum(allToolsNames),
  toolParams: z.any(),
});

async function executeTool(params: z.infer<typeof ExecuteToolParams>) {
  const tool = ALL_TOOLS.find(tool => tool.function.name === params.toolName);
  if (!tool) {
    return { success: false, error: 'Tool not found' };
  }
  try {
    const data = tool.function.parse(JSON.stringify(params?.toolParams ?? {}));
    // eslint-disable-next-line
    // @ts-ignore
    const result = await tool.function.function(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  } catch (e) {
    if (e instanceof Error) {
      return { success: false, reason: e.message };
    }
    return { success: false, reason: JSON.stringify(e, null, 2) };
  }
}

const getAllMyTools = async () => {
  const tools = await toolsStorage.getTools();
  return tools.map(tool => ({ name: tool.name, desc: tool.description }));
};

const CheckToolDetailInputParams = z.object({
  name: z.enum(allToolsNames),
});

const checkToolDetailInput = async (params: z.infer<typeof CheckToolDetailInputParams>) => {
  const tool = ALL_TOOLS.find(tool => tool.function.name === params.name);
  if (!tool) {
    return { success: false, error: 'Tool not found' };
  }
  return {
    schema: tool.function.parameters,
  };
};

// const ToggleToolsActivationParams = z.object({
//   toolNames: z.array(z.enum(allToolsNames)).min(1),
//   isActive: z.boolean(),
// });

// const toggleToolsActivation = async (params: z.infer<typeof ToggleToolsActivationParams>) => {
//   try {
//     for (const name of params.toolNames) {
//       if (params.isActive) {
//         await toolsStorage.activateTool(name);
//       } else {
//         await toolsStorage.deactivateTool(name);
//       }
//     }
//     return { success: true };
//   } catch (e) {
//     console.error(e);
//     return { success: false };
//   }
// };

export const toolManagingTools = [
  zodFunction({
    function: getAllMyTools,
    schema: z.object({}),
    description: 'Get all my useful tools',
  }),
  zodFunction({
    function: checkToolDetailInput,
    schema: CheckToolDetailInputParams,
    description: 'Check tool detail input',
  }),
  // zodFunction({
  //   function: toggleToolsActivation,
  //   schema: ToggleToolsActivationParams,
  //   description: 'Toggle activation of a tool',
  // }),
];

export const anyCall = zodFunction({
  function: executeTool,
  schema: ExecuteToolParams,
  description: 'Execute any tool with params',
});
