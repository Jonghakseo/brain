export const calculateImageFileSize = (base64Image: string) => {
  const base64String = base64Image.substring(base64Image.indexOf(',') + 1);
  const bits = base64String.length * 6; // 567146
  const bytes = bits / 8;
  const kb = Math.ceil(bytes / 1000);
  return kb;
};
