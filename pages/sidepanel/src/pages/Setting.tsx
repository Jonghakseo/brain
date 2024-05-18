import Layout from '@src/components/Layout';
import { Input, Switch, Textarea, Typography } from '@material-tailwind/react';
import { settingStorage, useStorage } from '@chrome-extension-boilerplate/shared';

export default function Setting() {
  const { llmConfig, extensionConfig } = useStorage(settingStorage);
  return (
    <Layout>
      <Typography as="h1" className="text-2xl font-semibold">
        Setting
      </Typography>
      <section className="flex mt-4 gap-y-4 gap-x-6 flex-wrap">
        <div className="flex flex-col gap-4">
          <Typography as="h2" className="text-xl font-semibold">
            AI(LLM) Config
          </Typography>
          <Textarea
            label="System Prompt"
            defaultValue={llmConfig.systemPrompt}
            onChange={e => {
              settingStorage.updateLLMConfig('systemPrompt', e.target.value);
            }}
          />
          <Input
            label="Temperature"
            step={0.1}
            max={2}
            min={0}
            type="number"
            value={llmConfig.temperature}
            onChange={e => {
              settingStorage.updateLLMConfig('temperature', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Top P"
            step={0.1}
            max={1}
            min={0}
            type="number"
            value={llmConfig.topP}
            onChange={e => {
              settingStorage.updateLLMConfig('topP', e.target.valueAsNumber);
            }}
          />
          <Input
            label="Max Tokens"
            min={1}
            step={1}
            max={4095}
            type="number"
            value={llmConfig.maxTokens}
            onChange={e => {
              settingStorage.updateLLMConfig('maxTokens', e.target.valueAsNumber);
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
            label="Chat with Capture"
            defaultChecked={extensionConfig.autoCapture}
            onChange={e => {
              settingStorage.updateExtensionConfig('autoCapture', e.currentTarget.checked);
            }}
          />
          <Switch
            label="Use Only Latest Image"
            defaultChecked={extensionConfig.useLatestImage}
            onChange={e => {
              settingStorage.updateExtensionConfig('useLatestImage', e.currentTarget.checked);
            }}
          />
          <Switch
            label="Use Detail Analyze Image (more token usage)"
            defaultChecked={extensionConfig.detailAnalyzeImage}
            onChange={e => {
              settingStorage.updateExtensionConfig('detailAnalyzeImage', e.currentTarget.checked);
            }}
          />
          <Typography as="h2" className="text-xl font-semibold">
            Experiment Config
          </Typography>

          <Switch
            label="Auto Tool Selection"
            defaultChecked={extensionConfig.autoToolSelection}
            onChange={e => {
              settingStorage.updateExtensionConfig('autoToolSelection', e.currentTarget.checked);
            }}
          />
          <Switch
            label="Auto Switch GPT3.5 Turbo (detault: GPT4o)"
            defaultChecked={extensionConfig.autoSelectModel}
            onChange={e => {
              settingStorage.updateExtensionConfig('autoSelectModel', e.currentTarget.checked);
            }}
          />
        </div>
      </section>
    </Layout>
  );
}
