import { type JSX, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useMenuOverlay } from './menuOverlayStore';

export const MenuOverlayLayer = (): JSX.Element | null => {
  const { x, y, content, isOpen, closeContextMenu } = useMenuOverlay();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEvents = () => {
      closeContextMenu();
    };

    window.addEventListener('click', handleEvents);
    window.addEventListener('scroll', handleEvents, true);

    return () => {
      window.removeEventListener('click', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
    };
  }, [isOpen, closeContextMenu]);

  if (!isOpen || !content) {
    return null;
  }

  const contextMenuPortal = document.getElementById('context-menu-portal');
  const menuContent = (
    <div
      className='context-menu-container'
      style={{ top: y, left: x, position: 'fixed', pointerEvents: 'auto' }}
    >
      {content}
    </div>
  );

  if (contextMenuPortal) {
    return createPortal(menuContent, contextMenuPortal);
  }

  return menuContent;
};
