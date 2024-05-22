import Layout from '@src/components/Layout';
import { Switch, Typography } from '@material-tailwind/react';
import { toolsStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { Fragment } from 'react';
import PopoverWithHover from '@src/components/PopoverWithHover';

export default function Tools() {
  const tools = useStorage(toolsStorage);

  const toolsByCategory = tools.reduce(
    (acc, tool) => {
      if (!tool.category) {
        tool.category = 'Uncategorized';
      }
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, (typeof tools)[number][]>,
  );

  return (
    <Layout>
      <Typography as="h1" className="text-2xl font-semibold">
        Tools
      </Typography>
      <article className="flex flex-col gap-2 mt-4">
        {Object.entries(toolsByCategory).map(([category, tools]) => {
          return (
            <Fragment key={category}>
              <div className="flex justify-between">
                <Typography as="h2" className="text-lg font-semibold mt-2">
                  {category}
                </Typography>
                <Switch
                  label="Toggle All"
                  defaultChecked={tools.every(tool => tool.isActivated)}
                  onChange={event => toolsStorage.toggleAllByCategory(category, event.target.checked)}
                />
              </div>
              <hr />
              <section className="grid grid-cols-2 gap-2">
                {tools.map(tool => {
                  return (
                    <div
                      key={tool.name}
                      className="flex flex-col gap-4 rounded-md border-2 p-2 cursor-pointer"
                      onClick={() => {
                        if (!tool.isActivated) {
                          void toolsStorage.activateTool(tool.name);
                        } else {
                          void toolsStorage.deactivateTool(tool.name);
                        }
                      }}>
                      <PopoverWithHover
                        content={
                          <Typography as="p" className="text-sm">
                            {tool.description}
                          </Typography>
                        }>
                        <Switch
                          label={<label className="capitalize">{tool.name}</label>}
                          checked={tool.isActivated}
                          onChange={() => {}}
                        />
                      </PopoverWithHover>
                    </div>
                  );
                })}
              </section>
            </Fragment>
          );
        })}
      </article>
    </Layout>
  );
}
