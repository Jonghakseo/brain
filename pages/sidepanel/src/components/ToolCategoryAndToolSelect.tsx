import { Program, programStorage, toolsStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { memo, useMemo, useState } from 'react';
import { Option, Select } from '@material-tailwind/react';

const UNCATEGORIZED = 'Uncategorized';
const JUST_THINK = 'Just Think';

type ToolCategoryAndToolSelectProps = {
  programId: Program['id'];
  stepId: Program['steps'][number]['id'];
};

const ToolCategoryAndToolSelect = ({ stepId, programId }: ToolCategoryAndToolSelectProps) => {
  const tools = useStorage(toolsStorage);
  const { programs } = useStorage(programStorage);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const selectedProgram = programs.find(program => program.id === programId);
  const toolCategories = useMemo(() => {
    return [JUST_THINK, ...Array.from(new Set(tools.map(tool => tool.category ?? UNCATEGORIZED)))];
  }, [tools]);

  if (!selectedProgram) {
    return null;
  }
  const stepInfo = selectedProgram?.steps.find(step => step.id === stepId);
  if (!stepInfo) {
    return null;
  }
  const selectedTool = stepInfo?.tool ?? '';
  console.log(selectedTool);
  const selectedToolsCategory = tools.find(tool => tool.name === selectedTool)?.category ?? JUST_THINK;

  const category = selectedCategory ?? selectedToolsCategory;

  const makeToolEmpty = () => {
    void programStorage.updateProgram(selectedProgram.id, {
      steps: selectedProgram.steps.map(step => {
        if (step.id === stepId) {
          return { ...step, tool: '' };
        }
        return step;
      }),
    });
  };

  return (
    <>
      <Select
        label="Tool Category"
        className="capitalize"
        value={category}
        onChange={value => {
          makeToolEmpty();
          setSelectedCategory(value);
        }}>
        {toolCategories.map(toolCategory => (
          <Option key={toolCategory} value={toolCategory}>
            {toolCategory}
          </Option>
        ))}
      </Select>
      {category !== JUST_THINK && (
        <Select
          label="Tools"
          error={tools.every(_tool => _tool.name !== selectedTool)}
          className="capitalize"
          defaultValue={selectedTool}
          value={selectedTool}
          onChange={value => {
            void programStorage.updateProgram(selectedProgram.id, {
              steps: selectedProgram.steps.map(step => {
                if (step.id === stepId) {
                  return {
                    ...step,
                    tool: value ?? '',
                  };
                }
                return step;
              }),
            });
          }}>
          {tools
            .filter(_tool => (_tool.category ?? UNCATEGORIZED) === category)
            .map(tool => (
              <Option key={tool.name} value={tool.name} className="capitalize">
                [{tool.name}] {tool.description}
              </Option>
            ))}
        </Select>
      )}
    </>
  );
};

export default memo(ToolCategoryAndToolSelect);
