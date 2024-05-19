import { createPortal } from 'react-dom';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};
export default function Modal({ isOpen, onClose, children, header, className = '' }: ModalProps) {
  return createPortal(
    isOpen ? (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        onClick={onClose}
        tabIndex={-1}
        aria-hidden={isOpen ? 'false' : 'true'}
        className={
          (isOpen ? '' : 'hidden ') +
          'flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[100%] max-h-full '
        }>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          onClick={e => e.stopPropagation()}
          className={`relative p-4 w-full max-h-[80%] max-w-[80%] overflow-y-scroll bg-white rounded-lg shadow dark:bg-gray-700 ${className}`}>
          <div className="relative">
            <div className="flex items-center justify-between p-0 border-b rounded-t dark:border-gray-600">
              <h3 className="text-m font-semibold text-gray-900 dark:text-white">{header}</h3>
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
            <div className="h-auto w-full rounded-lg">{children}</div>
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
}
