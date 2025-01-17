import { createPortal } from 'react-dom';
import { Chat, conversationStorage } from '@chrome-extension-boilerplate/shared';
import PopoverWithHover from '@src/components/PopoverWithHover';

type ImageViewModalProps = {
  createdAt: Chat['createdAt'];
  image: Chat['content']['image'];
  isOpen: boolean;
  onClose: () => void;
};
export default function ImageViewModal({ createdAt, image, isOpen, onClose }: ImageViewModalProps) {
  const imageDimensionText = image?.w && image.h ? `W:${image?.w} x H:${image?.h} - ` : '';
  const imageSizeText = `Size:${image?.kb}KB`;
  const imageInfoText = `${imageDimensionText}${imageSizeText}`;

  const deleteImage = () => {
    void conversationStorage.deleteChat(createdAt);
    onClose();
  };

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
              <h3 className="text-m font-semibold text-gray-900 dark:text-white">{imageInfoText}</h3>
              <PopoverWithHover content="Delete" placement="top">
                <button
                  type="button"
                  onClick={deleteImage}
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
                    <path
                      fillRule="evenodd"
                      d="M13 6H3v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6ZM5.72 7.47a.75.75 0 0 1 1.06 0L8 8.69l1.22-1.22a.75.75 0 1 1 1.06 1.06L9.06 9.75l1.22 1.22a.75.75 0 1 1-1.06 1.06L8 10.81l-1.22 1.22a.75.75 0 0 1-1.06-1.06l1.22-1.22-1.22-1.22a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </PopoverWithHover>
            </div>
            <img className="h-auto w-full rounded-lg object-cover object-center" src={image?.base64} alt="detail" />
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
}
