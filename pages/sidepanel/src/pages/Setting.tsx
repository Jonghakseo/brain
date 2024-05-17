import Layout from '@src/components/Layout';
import { Input, Switch, Textarea, Typography } from '@material-tailwind/react';
import { settingStorage, useStorage } from '@chrome-extension-boilerplate/shared';

export default function Setting() {
  const { openaiConfig, extensionConfig } = useStorage(settingStorage);
  return (
    <Layout>
      <Typography as="h1" className="text-2xl font-semibold">
        Setting
      </Typography>
      <section className="flex mt-4 gap-6">
        <div className="flex flex-col gap-4">
          <Typography as="h2" className="text-xl font-semibold">
            OpenAI Config
          </Typography>
          <Textarea
            label="System Prompt"
            value={openaiConfig.systemPrompt}
            onChange={e => {
              settingStorage.updateOpenAIConfig('systemPrompt', e.target.value);
            }}
          />
          <Input
            label="Temperature"
            step={0.1}
            max={2}
            min={0}
            type="number"
            value={openaiConfig.temperature}
            onChange={e => {
              settingStorage.updateOpenAIConfig('temperature', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Top P"
            step={0.1}
            max={1}
            min={0}
            type="number"
            value={openaiConfig.topP}
            onChange={e => {
              settingStorage.updateOpenAIConfig('topP', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Max Tokens"
            min={1}
            step={1}
            max={4095}
            type="number"
            value={openaiConfig.maxTokens}
            onChange={e => {
              settingStorage.updateOpenAIConfig('maxTokens', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Frequency Penalty"
            step={0.1}
            max={2}
            min={0}
            type="number"
            value={openaiConfig.frequencyPenalty}
            onChange={e => {
              settingStorage.updateOpenAIConfig('frequencyPenalty', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Presence Penalty"
            step={0.1}
            max={2}
            min={0}
            type="number"
            value={openaiConfig.presencePenalty}
            onChange={e => {
              settingStorage.updateOpenAIConfig('presencePenalty', e.target.valueAsNumber);
            }}
          />
        </div>
        <div className="flex flex-col gap-4">
          <Typography as="h2" className="text-xl font-semibold">
            Extension Config
          </Typography>
          <Input
            label="Screen Capture Quality"
            step={1}
            max={100}
            min={1}
            type="number"
            value={extensionConfig.captureQuality}
            onChange={e => {
              settingStorage.updateExtensionConfig('captureQuality', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Forget Chat After"
            step={1}
            min={0}
            type="number"
            value={extensionConfig.forgetChatAfter}
            onChange={e => {
              settingStorage.updateExtensionConfig('forgetChatAfter', e.target.valueAsNumber);
            }}
          />
          <Switch
            label="Auto Capture"
            checked={extensionConfig.autoCapture}
            onChange={e => {
              settingStorage.updateExtensionConfig('autoCapture', e.currentTarget.checked);
            }}
          />
          <Switch
            label="Auto Tool Section"
            checked={extensionConfig.autoToolSelection}
            onChange={e => {
              settingStorage.updateExtensionConfig('autoToolSelection', e.currentTarget.checked);
            }}
          />
        </div>
      </section>
    </Layout>
  );
}
