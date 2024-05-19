// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {
  billingTools,
  etcTools,
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

export const ALL_TOOLS = [
  ...billingTools,
  ...settingTools,
  ...urlTools,
  ...screenTools,
  ...etcTools,
  ...tabsTools,
  // TODO: this function is unstable
  // ...domTools,
];

chrome.runtime.onInstalled.addListener(() => {
  const addCategoryIntoTools =
    <T>(tools: T[]) =>
    (categoryName: string) => {
      return tools.map(tool => ({ ...tool, category: categoryName })) as T & { category: string }[];
    };

  // Resister all tools when the extension is installed
  void toolsStorage.registerTools([
    // ...addCategoryIntoTools(toolManagingTools)('Config'),
    ...addCategoryIntoTools(settingTools)('Config'),
    ...addCategoryIntoTools(urlTools)('History & Bookmark'),
    ...addCategoryIntoTools(tabsTools)('Tab Manage & Navigation'),
    ...addCategoryIntoTools(screenTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(searchTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(programTools)('Programs & Macros'),
    ...addCategoryIntoTools(etcTools)('ETC tools'),
    ...addCategoryIntoTools(billingTools)('OpenAI Usage'),
    // ...addCategoryIntoTools(domTools)('dom'),
  ]);
});

const allToolsNames = ALL_TOOLS.map(tool => tool.function.name) as [string, ...string[]];

const ExecuteToolParams = z.object({
  toolName: z.string(),
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

const GetMyToolDetailInfoParams = z.object({
  toolName: z.string(),
});

const getMyToolDetailInfo = async (params: z.infer<typeof GetMyToolDetailInfoParams>) => {
  const tool = ALL_TOOLS.find(tool => tool.function.name === params.toolName);
  if (!tool) {
    return { success: false, error: 'Tool not found' };
  }
  return {
    name: tool.function.name,
    description: tool.function.description,
    input: tool.function.parameters,
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
    function: getMyToolDetailInfo,
    schema: GetMyToolDetailInfoParams,
    description: 'Get detail information of a tool',
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
