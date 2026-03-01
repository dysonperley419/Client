import './modal.css';
import './popup.css';

import { type JSX } from 'react';
import { createPortal } from 'react-dom';

import { ConfirmationConnectP2PModal } from '@/components/modals/confirmationConnectP2P';
import { DangerConfirmationModal } from '@/components/modals/dangerConfirmationModal';
import { useGuildChannelMemoryStore } from '@/stores/gncMemoryStore';

import { ClearSelectedInstanceModal } from '../components/modals/clearSelectedInstance';
import { ConfirmationDeleteModal } from '../components/modals/confirmationDelete';
import { ConfirmationLeaveModal } from '../components/modals/confirmationLeave';
import { CreateServerModal } from '../components/modals/createServer';
import { ImagePreview } from '../components/modals/imagePreview';
import { JoinOrCreateServerModal } from '../components/modals/joinOrCreateServer';
import { JoinServerModal } from '../components/modals/joinServer';
import { PopoutEmoji } from '../components/modals/popoutEmoji';
import { PopoutProfile } from '../components/modals/popoutProfile';
import { ServerProfileModal } from '../components/modals/serverProfile';
import { UserProfileModal } from '../components/modals/userProfile';
import { type ModalDataMap, useModal } from './modalContext';
import { type PopupDataMap, usePopup } from './popupContext';

export const LayerPortals = (): JSX.Element | null => {
  const { modalType, modalData, closeModal } = useModal();
  const { popupType, popupData, closePopup } = usePopup();
  const currentGuildId = useGuildChannelMemoryStore((s) => s.currentGuildId);

  const modalPortal = document.getElementById('modal-portal');

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

  const renderPopup = () => {
    switch (popupType) {
      case 'USER_PROFILE_POPOUT': {
        const data = popupData as PopupDataMap['USER_PROFILE_POPOUT'];

        const popoutHeight = 450;
        const popoutWidth = 300;

        let fixedX = data.x;
        let fixedY = data.y;

        if (data.y + popoutHeight > window.innerHeight) {
          fixedY = window.innerHeight - popoutHeight;
        }

        if (data.x + popoutWidth > window.innerWidth) {
          fixedX = data.x - popoutWidth;
        }

        return (
          <div
            className='popup-wrapper'
            style={{ top: Math.max(10, fixedY), left: fixedX, position: 'fixed' }}
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

        return (
          <div
            className='popup-wrapper'
            style={{ top: data.y, left: data.x, position: 'fixed' }}
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
        const padding = 20;

        let fixedX = data.x + 50;
        let fixedY = data.y + 100;

        if (fixedY + popoutHeight > window.innerHeight - padding) {
          fixedY = window.innerHeight - popoutHeight - padding;
        }

        if (fixedY < padding) {
          fixedY = padding;
        }

        if (fixedX + popoutWidth > window.innerWidth - padding) {
          fixedX = data.x - popoutWidth - 10;
        }

        return (
          <div
            className='popup-wrapper'
            style={{ top: fixedY, left: fixedX, position: 'fixed' }}
            role='dialog'
            tabIndex={-1}
          >
            <PopoutEmoji
              emoji={data.emoji}
              guildIcon={data.guildIcon}
              guildId={data.guildId}
              guildName={data.guildName}
              isPrivate={data.isPrivate}
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
