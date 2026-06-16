import React from 'react';

interface Props {
  rootRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

const OutsideMenuHandler: React.FC<Props> = ({ rootRef, onClose }) => {
  React.useEffect(() => {
    function handleClick(e: Event) {
      const root = rootRef.current;
      if (!root) return;
      const target = (e as Event & { target: Node }).target as Node | null;
      if (target && root && !root.contains(target)) {
        onClose();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [rootRef, onClose]);

  return null;
};

export default OutsideMenuHandler;
