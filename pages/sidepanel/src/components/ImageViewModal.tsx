import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

type ImageViewModalProps = {
  image: string;
  isOpen: boolean;
  onClose: () => void;
};
export default function ImageViewModal({ image, isOpen, onClose }: ImageViewModalProps) {
  const imageSize = useRef<{ width: number; height: number }>(null);

  useEffect(() => {
    calculateImageSize(image).then(size => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      imageSize.current = size;
    });
  }, [image]);

  return createPortal(
    isOpen ? (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        onClick={onClose}
        tabIndex={-1}
        aria-hidden={isOpen ? 'false' : 'true'}
        className={
          (isOpen ? '' : 'hidden ') +
          'flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[100%] max-h-full'
        }>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          onClick={e => e.stopPropagation()}
          className="relative p-4 w-full max-h-[80%] max-w-[80%] overflow-y-scroll bg-white rounded-lg shadow dark:bg-gray-700">
          <div className="relative">
            <div className="flex items-center justify-between p-0 border-b rounded-t dark:border-gray-600">
              <h3 className="text-m font-semibold text-gray-900 dark:text-white">{`W:${imageSize.current?.width} x H:${imageSize.current?.height} - ${calculateImageFileSize(image)}Kb`}</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
                <svg
                  className="w-3 h-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
              </button>
            </div>
            <img className="h-auto w-full rounded-lg object-cover object-center" src={image} alt="detail" />
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
}

const calculateImageFileSize = (base64Image: string) => {
  const base64String = base64Image.substring(base64Image.indexOf(',') + 1);
  const bits = base64String.length * 6; // 567146
  const bytes = bits / 8;
  const kb = Math.ceil(bytes / 1000);
  return kb;
};

const calculateImageSize = (base64Image: string) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.src = base64Image;
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
    };
    image.onerror = reject;
  });
};
