import {
  conversationStorage,
  Program,
  programStorage,
  sendToBackground,
  useStorage,
} from '@chrome-extension-boilerplate/shared';
import { Button } from '@material-tailwind/react';
import { useState } from 'react';

export default function ProgramBadges() {
  const { programs } = useStorage(programStorage);
  const [runningProgramIds, setRunningProgramIds] = useState<string[]>([]);

  const runProgram = async (program: Program) => {
    try {
      await conversationStorage.saveUserChat({ text: `Run program: ${program.name}` });
      setRunningProgramIds([...runningProgramIds, program.id]);
      await sendToBackground('RunProgram', { programId: program.id });
    } catch (e) {
      console.error(e);
    } finally {
      setRunningProgramIds(runningProgramIds.filter(id => id !== program.id));
    }
  };

  return (
    <section className="relative">
      <div className="absolute z-20 left-1 top-[-12px] flex flex-row gap-2 overflow-x-scroll max-w-[300px]">
        {programs
          .filter(program => program.isPinned)
          .map(program => (
            <Button
              size="sm"
              key={program.id}
              color="gray"
              variant="gradient"
              className="flex flex-col gap-4 rounded-md p-1.5"
              disabled={runningProgramIds.includes(program.id)}
              onClick={() => runProgram(program)}>
              {program.name}
            </Button>
          ))}
      </div>
    </section>
  );
}
