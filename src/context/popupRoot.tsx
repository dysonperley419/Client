import './popup.css';

import { createPortal } from 'react-dom';

import { PopoutProfile } from '../components/modals/popoutProfile';
import { UserProfileModal } from '../components/modals/userProfile';
import { type PopupDataMap, usePopup } from './popupContext';
import { PopoutEmoji } from '@/components/modals/popoutEmoji';

export const PopupRoot = () => {
  const { popupType, popupData, closePopup } = usePopup();

  if (!popupType) return null;

  const renderPopup = () => {
    switch (popupType) {
      case 'USER_PROFILE_POPOUT': {
        const data = popupData as PopupDataMap['USER_PROFILE_POPOUT'];

        const popout_height = 450;
        const popout_width = 300;

        let fixedX = data.x;
        let fixedY = data.y;

        if (data.y + popout_height > window.innerHeight) {
          fixedY = window.innerHeight - popout_height; // + 110; (find a middle ground for msg author profile popouts uhh) - leeway from bottom of the member list
        }

        if (data.x + popout_width > window.innerWidth) {
          fixedX = data.x - popout_width;
        }

        return (
          <div
            className='popup-wrapper'
            style={{ top: Math.max(10, fixedY), left: fixedX, position: 'fixed' }}
            role='dialog'
            tabIndex={-1}
          >
            <PopoutProfile member={data.member} roles={data.roles} contextGuildId={null} />
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

        const popout_height = 320;
        const popout_width = 280;
        const padding = 20;

        let fixedX = data.x + 50;
        let fixedY = data.y + 100;

        if (fixedY + popout_height > window.innerHeight - padding) {
          fixedY = window.innerHeight - popout_height - padding;
        }

        if (fixedY < padding) {
          fixedY = padding;
        }

        if (fixedX + popout_width > window.innerWidth - padding) {
          fixedX = data.x - popout_width - 10;
        }

        return (
          <div
            className='popup-wrapper'
            style={{ 
              top: fixedY, 
              left: fixedX, 
              position: 'fixed',
              zIndex: 10001
            }}
            role='dialog'
            tabIndex={-1}
          >
            <PopoutEmoji emoji={data.emoji}
            guildIcon={data.guildIcon}
            guildId={data.guildId}
              guildName={data.guildName} 
              isPrivate={data.isPrivate} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  const modalPortal = document.getElementById('modal-portal');

  if (modalPortal) {
    return createPortal(
      <>
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
        {renderPopup()}
      </>,
      modalPortal,
    );
  } else {
    console.error('Failed to find the modal portal element');
    return null;
  }
};
