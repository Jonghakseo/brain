import { Program, programStorage, toolsStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { memo } from 'react';
import { Chip, Typography } from '@material-tailwind/react';
import PopoverWithHover from '@src/components/PopoverWithHover';
import { colors } from '@material-tailwind/react/types/generic';

type ToolCategoryAndToolSelectProps = {
  programId: Program['id'];
  stepId: Program['steps'][number]['id'];
};

const ToolCategoryAndToolSelect = ({ stepId, programId }: ToolCategoryAndToolSelectProps) => {
  const tools = useStorage(toolsStorage);
  const { programs } = useStorage(programStorage);

  const selectedProgram = programs.find(program => program.id === programId);
  if (!selectedProgram) {
    return null;
  }
  const stepInfo = selectedProgram?.steps.find(step => step.id === stepId);
  if (!stepInfo) {
    return null;
  }

  const toggleTool = (tool: string) => {
    void programStorage.updateProgram(selectedProgram.id, {
      steps: selectedProgram.steps.map(step => {
        console.log(step);
        if (step.id === stepId) {
          return {
            ...step,
            tools: step.tools?.includes(tool) ? step.tools?.filter(t => t !== tool) : [...(step.tools ?? []), tool],
          };
        }
        return step;
      }),
    });
  };

  const categoryColorMap = Array.from(new Set(tools.map(tool => tool.category ?? 'Uncategorized'))).reduce<
    Record<string, colors>
  >((acc, category, currentIndex) => {
    return {
      ...acc,
      [category]: colorArray[currentIndex],
    };
  }, {});
  console.log(programs);
  return (
    <section className="grid grid-cols-4 gap-2">
      {tools?.map(tool => {
        const isSelected = stepInfo.tools?.includes(tool.name);
        return (
          <PopoverWithHover
            key={tool.name}
            content={
              <Typography as="p" className="text-sm font-semibold">
                {tool.description}
              </Typography>
            }>
            <div className="cursor-pointer overflow-x-hidden" onClick={() => toggleTool(tool.name)}>
              <Chip
                className="!capitalize"
                size="sm"
                value={tool.name}
                variant={isSelected ? 'filled' : 'outlined'}
                color={tool.category ? categoryColorMap[tool.category] : 'gray'}
              />
            </div>
          </PopoverWithHover>
        );
      })}
    </section>
  );
};

export default memo(ToolCategoryAndToolSelect);

const colorArray: colors[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'indigo',
  'pink',
  'orange',
  'teal',
  'cyan',
  'light-blue',
  'lime',
  'amber',
  'gray',
];
