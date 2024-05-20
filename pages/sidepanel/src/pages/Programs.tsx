import Layout from '@src/components/Layout';
import { Program, programStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { Button, Input, Switch, Textarea, Typography } from '@material-tailwind/react';
import Modal from '@src/components/Modal';
import { useState } from 'react';
import ToolCategoryAndToolSelect from '@src/components/ToolCategoryAndToolSelect';

export default function Programs() {
  const { programs } = useStorage(programStorage);
  const [selectedProgramId, setSelectedProgramId] = useState<Program['id'] | undefined>(undefined);
  const selectedProgram = programs.find(program => program.id === selectedProgramId);
  const openStepModal = (programId: string) => {
    setSelectedProgramId(programId);
  };

  const closeStepModal = () => {
    setSelectedProgramId(undefined);
  };

  const createNewProgram = async () => {
    await programStorage.createProgram({
      id: 'program-' + Date.now(),
      name: 'Program',
      steps: [],
      isPinned: false,
    });
  };

  return (
    <Layout>
      <Typography as="h1" className="text-2xl font-semibold">
        Programs
      </Typography>

      <Button size="sm" color="blue" className="mt-4" onClick={createNewProgram}>
        Create Program
      </Button>

      <section className="flex mt-4 gap-y-4 gap-x-6 flex-wrap">
        {programs.map(program => (
          <div key={program.id} className="flex flex-col gap-4 min-w-[300px]">
            <Input
              label="Program Name"
              defaultValue={program.name}
              onChange={e => programStorage.updateProgram(program.id, { name: e.target.value })}
            />
            <Button color="blue" variant="outlined" size="sm" onClick={() => openStepModal(program.id)}>
              View Steps
            </Button>

            <div className="flex justify-between">
              <div className="flex gap-2">
                <Switch
                  label="Pin"
                  defaultChecked={program.isPinned}
                  onChange={() => programStorage.updateProgram(program.id, { isPinned: !program.isPinned })}
                />
                {/*{program.__records?.isUseful && (*/}
                {/*  <Switch*/}
                {/*    label="UseRecord"*/}
                {/*    defaultChecked={!!program.useRecord}*/}
                {/*    onChange={() => programStorage.updateProgram(program.id, { useRecord: !program.useRecord })}*/}
                {/*  />*/}
                {/*)}*/}
              </div>
              <Button color="red" variant="outlined" size="sm" onClick={() => programStorage.removeProgram(program.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
      <Modal isOpen={!!selectedProgram} onClose={closeStepModal} header={selectedProgram?.name} className="min-h-[60%]">
        {selectedProgram && (
          <div className="pt-2">
            {selectedProgram?.steps.map((stepInfo, index) => {
              const { id, tools, whatToDo } = stepInfo;
              return (
                <div key={id} className="flex flex-col gap-4 pt-4">
                  <Typography as="h2" className="text-lg font-semibold shrink-0">
                    Step {index + 1}
                  </Typography>
                  <ToolCategoryAndToolSelect programId={selectedProgram.id} stepId={id} />
                  <Textarea
                    label={'What to do with ' + tools?.join(', ')}
                    defaultValue={whatToDo}
                    onChange={e => {
                      void programStorage.updateProgram(selectedProgram.id, {
                        steps: selectedProgram.steps.map((s, i) =>
                          i === index ? { ...s, whatToDo: e.target.value } : s,
                        ),
                      });
                    }}
                  />
                  <div className="flex justify-between">
                    <Button
                      color="blue"
                      variant="outlined"
                      size="sm"
                      onClick={() => {
                        void programStorage.updateProgram(selectedProgram.id, {
                          steps: [
                            ...selectedProgram.steps.slice(0, index + 1),
                            {
                              id: Date.now(),
                              whatToDo: selectedProgram.steps[index].whatToDo,
                              tools: selectedProgram.steps[index].tools,
                            },
                            ...selectedProgram.steps.slice(index + 1),
                          ],
                        });
                      }}>
                      Insert Step
                    </Button>
                    <Button
                      color="red"
                      variant="outlined"
                      size="sm"
                      onClick={() => {
                        void programStorage.updateProgram(selectedProgram.id, {
                          steps: selectedProgram.steps.filter((_, i) => i !== index),
                        });
                      }}>
                      Delete Step
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              color="blue"
              className="mt-4"
              size="sm"
              onClick={() => {
                void programStorage.updateProgram(selectedProgram.id, {
                  steps: [
                    ...selectedProgram.steps,
                    {
                      id: Date.now(),
                      whatToDo: '',
                      tools: [],
                    },
                  ],
                });
              }}>
              Add New Step
            </Button>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
