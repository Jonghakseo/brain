const baseConfig = require('@chrome-extension-boilerplate/tailwindcss-config');
const withMT = require('@material-tailwind/react/utils/withMT');

/** @type {import('tailwindcss').Config} */
const config = {
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};

module.exports = withMT(config);
