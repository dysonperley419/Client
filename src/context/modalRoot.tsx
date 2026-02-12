import './modal.css';

import { createPortal } from 'react-dom';

import { ConfirmationConnectP2PModal } from '@/components/modals/confirmationConnectP2P';

import { ClearSelectedInstanceModal } from '../components/modals/clearSelectedInstance';
import { ConfirmationDeleteModal } from '../components/modals/confirmationDelete';
import { ConfirmationLeaveModal } from '../components/modals/confirmationLeave';
import { CreateServerModal } from '../components/modals/createServer';
import { ImagePreview } from '../components/modals/imagePreview';
import { JoinOrCreateServerModal } from '../components/modals/joinOrCreateServer';
import { JoinServerModal } from '../components/modals/joinServer';
import { ServerProfileModal } from '../components/modals/serverProfile';
import { type ModalDataMap, useModal } from './modalContext';

export const ModalRoot = () => {
  const { modalType, modalData, closeModal } = useModal();

  if (!modalType) return null;

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

      default:
        return null;
    }
  };

  const isProfile = modalType === 'SERVER_PROFILE';
  const isImagePreview = modalType === 'IMAGE_PREVIEW';

  const modalPortal = document.getElementById('modal-portal');

  if (modalPortal) {
    return createPortal(
      <>
        <button className={`modal-backdrop`} onClick={closeModal} aria-label='Close modal' />
        <div
          className={`modal-container ${isProfile ? 'modal-container-profile' : ''} ${isImagePreview ? 'modal-container-image-preview' : ''}`}
        >
          {renderModal()}
        </div>
      </>,
      modalPortal,
    );
  } else {
    console.error('Failed to find the modal portal element');
    throw Error();
  }
};
