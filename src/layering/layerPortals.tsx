import './modal.css';
import './popup.css';

import { type JSX, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ClearSelectedInstanceModal } from '@/components/modals/clearSelectedInstance';
import { ConfirmationConnectP2PModal } from '@/components/modals/confirmationConnectP2P';
import { ConfirmationDeleteModal } from '@/components/modals/confirmationDelete';
import { ConfirmationLeaveModal } from '@/components/modals/confirmationLeave';
import { CreateServerModal } from '@/components/modals/createServer';
import { DangerConfirmationModal } from '@/components/modals/dangerConfirmationModal';
import { EmojiChooser } from '@/components/modals/emojiChooser';
import { GifSearcher } from '@/components/modals/gifSearcher';
import { ImagePreview } from '@/components/modals/imagePreview';
import { JoinOrCreateServerModal } from '@/components/modals/joinOrCreateServer';
import { JoinServerModal } from '@/components/modals/joinServer';
import { PopoutEmoji } from '@/components/modals/popoutEmoji';
import { PopoutProfile } from '@/components/modals/popoutProfile';
import { ServerProfileModal } from '@/components/modals/serverProfile';
import { UserProfileModal } from '@/components/modals/userProfile';
import { useGuildChannelMemoryStore } from '@/stores/gncMemoryStore';
import type { Emoji } from '@/types/guilds';

import { type ModalDataMap, useModal } from './modalContext';
import { type PopupDataMap, usePopup } from './popupContext';

export const LayerPortals = (): JSX.Element | null => {
  const { modalType, modalData, closeModal } = useModal();
  const { popupType, popupData, closePopup } = usePopup();
  const currentGuildId = useGuildChannelMemoryStore((s) => s.currentGuildId);

  const modalPortal = document.getElementById('modal-portal');
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!modalPortal) {
    console.error('Failed to find the modal portal element');
    return null;
  }

  const renderModal = () => {
    switch (modalType) {
      case 'WHATS_IT_GONNA_BE':
        return <JoinOrCreateServerModal />;
      case 'CREATE_SERVER':
        return <CreateServerModal />;
      case 'JOIN_SERVER':
        return <JoinServerModal />;
      case 'CLEAR_SELECTED_INSTANCE':
        return <ClearSelectedInstanceModal />;
      case 'CONFIRMATION_CONNECT_P2P':
        return (
          <ConfirmationConnectP2PModal
            {...(modalData as ModalDataMap['CONFIRMATION_CONNECT_P2P'])}
          />
        );
      case 'CONFIRMATION_LEAVE':
        return <ConfirmationLeaveModal {...(modalData as ModalDataMap['CONFIRMATION_LEAVE'])} />;
      case 'CONFIRMATION_DELETE':
        return <ConfirmationDeleteModal {...(modalData as ModalDataMap['CONFIRMATION_DELETE'])} />;
      case 'SERVER_PROFILE':
        return <ServerProfileModal {...(modalData as ModalDataMap['SERVER_PROFILE'])} />;
      case 'IMAGE_PREVIEW':
        return <ImagePreview {...(modalData as ModalDataMap['IMAGE_PREVIEW'])} />;
      case 'DANGER_CONFIRMATION':
        return <DangerConfirmationModal {...(modalData as ModalDataMap['DANGER_CONFIRMATION'])} />;
      default:
        return null;
    }
  };

  const clampPosition = (x: number, y: number, width: number, height: number, padding = 10) => {
    const maxX = Math.max(padding, viewport.width - width - padding);
    const maxY = Math.max(padding, viewport.height - height - padding);

    return {
      x: Math.min(Math.max(x, padding), maxX),
      y: Math.min(Math.max(y, padding), maxY),
    };
  };

  const renderPopup = () => {
    switch (popupType) {
      case 'USER_PROFILE_POPOUT': {
        const data = popupData as PopupDataMap['USER_PROFILE_POPOUT'];

        const popoutHeight = 450;
        const popoutWidth = 300;
        const preferredX = data.x + popoutWidth > viewport.width ? data.x - popoutWidth : data.x;
        const { x: fixedX, y: fixedY } = clampPosition(
          preferredX,
          data.y,
          popoutWidth,
          popoutHeight,
        );

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed' }}
            role='dialog'
            tabIndex={-1}
          >
            <PopoutProfile
              member={data.member}
              roles={data.roles}
              contextGuildId={currentGuildId}
            />
          </div>
        );
      }
      case 'CURRENT_USER_PROFILE': {
        const data = popupData as PopupDataMap['CURRENT_USER_PROFILE'];
        const popoutHeight = 470;
        const popoutWidth = 340;
        const { x: fixedX, y: fixedY } = clampPosition(data.x, data.y, popoutWidth, popoutHeight);

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed' }}
            role='dialog'
            tabIndex={-1}
          >
            <UserProfileModal />
          </div>
        );
      }
      case 'EMOJI_DETAILS_POPOUT': {
        const data = popupData as PopupDataMap['EMOJI_DETAILS_POPOUT'];

        const popoutHeight = 320;
        const popoutWidth = 280;
        const preferredX =
          data.x + 50 + popoutWidth > viewport.width ? data.x - popoutWidth - 10 : data.x + 50;
        const preferredY = data.y + 100;
        const { x: fixedX, y: fixedY } = clampPosition(
          preferredX,
          preferredY,
          popoutWidth,
          popoutHeight,
          20,
        );

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed' }}
            role='dialog'
            tabIndex={-1}
          >
            <PopoutEmoji
              emoji={data.emoji as Emoji}
              guildIcon={data.guildIcon}
              guildId={data.guildId}
              guildName={data.guildName}
              isPrivate={data.isPrivate}
              isBuiltin={data.isBuiltin}
              unicode={data.unicode}
              sourceSubtext={data.sourceSubtext}
            />
          </div>
        );
      }
      case 'EMOJI_PICKER': {
        const data = popupData as PopupDataMap['EMOJI_PICKER'];
        const popoutHeight = 440;
        const popoutWidth = 350;
        const { x: fixedX, y: fixedY } = clampPosition(
          data.x - popoutWidth,
          data.y - popoutHeight,
          popoutWidth,
          popoutHeight,
        );

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed', width: popoutWidth }}
            role='dialog'
            tabIndex={-1}
          >
            <EmojiChooser
              guilds={data.guilds}
              onSelectEmoji={data.onSelectEmoji}
              onClose={closePopup}
              currentGuildId={currentGuildId ?? undefined}
            />
          </div>
        );
      }
      case 'GIF_PICKER': {
        const data = popupData as PopupDataMap['GIF_PICKER'];
        const popoutHeight = 440;
        const popoutWidth = 350;
        const { x: fixedX, y: fixedY } = clampPosition(
          data.x - popoutWidth,
          data.y - popoutHeight,
          popoutWidth,
          popoutHeight,
        );

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed', width: popoutWidth }}
            role='dialog'
            tabIndex={-1}
          >
            <GifSearcher
              gifCategories={data.gifCategories}
              gifs={data.gifs}
              onSearch={data.onSearch}
              onSelectGif={data.onSelectGif}
              onClose={closePopup}
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  const isProfile = modalType === 'SERVER_PROFILE';
  const isImagePreview = modalType === 'IMAGE_PREVIEW';
  const modalContents = renderModal();
  const popupContents = renderPopup();

  return (
    <>
      {popupType &&
        createPortal(
          <div className='popup-layer'>
            <div
              className='popup-backdrop'
              onClick={closePopup}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') closePopup();
              }}
              role='button'
              tabIndex={0}
              aria-label='Close popup'
            />
            {popupContents}
          </div>,
          modalPortal,
        )}
      {modalType &&
        createPortal(
          <div className={`modal-layer ${isImagePreview ? 'modal-layer-image-preview' : ''}`}>
            <button
              type='button'
              className='modal-backdrop'
              onClick={closeModal}
              aria-label='Close modal'
            />
            <div
              className={`modal-container ${isProfile ? 'modal-container-profile' : ''} ${isImagePreview ? 'modal-container-image-preview' : ''}`}
            >
              {modalContents}
            </div>
          </div>,
          modalPortal,
        )}
    </>
  );
};
