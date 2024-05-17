import Layout from '@src/components/Layout';
import { Popover, PopoverContent, PopoverHandler, Switch, Typography } from '@material-tailwind/react';
import { toolsStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { Fragment, useState } from 'react';

export default function Tools() {
  const tools = useStorage(toolsStorage);

  const toolsByCategory = tools.reduce(
    (acc, tool) => {
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
      <article className="flex flex-col gap-4">
        {Object.entries(toolsByCategory).map(([category, tools]) => {
          return (
            <Fragment key={category}>
              <Typography as="h2" className="text-xl font-semibold">
                {category}
              </Typography>
              <section className="grid grid-cols-2 gap-2">
                {tools.map(tool => {
                  return (
                    <div key={tool.name} className="flex flex-col gap-4 rounded-md border-2 p-2">
                      <PopoverWithHover
                        content={
                          <Typography as="p" className="text-sm">
                            {tool.description}
                          </Typography>
                        }>
                        <Switch
                          label={<label className="capitalize">{tool.name}</label>}
                          checked={tool.isActivated}
                          onChange={e => {
                            if (e.target.checked) {
                              void toolsStorage.activateTool(tool.name);
                            } else {
                              void toolsStorage.deactivateTool(tool.name);
                            }
                          }}
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

type PopoverWithHoverProps = {
  children: React.ReactNode;
  content: React.ReactNode;
};

function PopoverWithHover({ children, content }: PopoverWithHoverProps) {
  const [open, setOpen] = useState(false);

  const triggers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
  };

  return (
    <Popover open={open} handler={setOpen}>
      <PopoverHandler>
        <div {...triggers}>{children}</div>
      </PopoverHandler>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}