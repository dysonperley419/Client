import './settings.css';

import { type JSX, useEffect, useState } from 'react';

import { useAssetsUrl } from '@/context/assetsUrl';
import { useModal } from '@/context/modalContext';
import type { User } from '@/types/users';
import { getDefaultAvatar } from '@/utils/avatar';

interface SettingsProps {
  user: User | null;
  onClose: () => void;
}

interface DevSettings {
  log_gateway: boolean;
  webrtc_p2p: boolean;
  popout_console: boolean;
}

const DefaultDevSettings: DevSettings = {
  log_gateway: false,
  webrtc_p2p: false,
  popout_console: false
};

const Settings = ({ user, onClose }: SettingsProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState('My Account');
  const [editingProfile, setEditingProfile] = useState(false);
  const { openModal, closeModal } = useModal();
  const [devSettings, setDevSettings] = useState(() => {
    const saved = localStorage.getItem('developerSettings');

    return saved ? (JSON.parse(saved) as DevSettings) : DefaultDevSettings;
  });

  const { url: defaultAvatarUrl } = useAssetsUrl(`/assets/${getDefaultAvatar(user) ?? ''}.png`);

  const avatarUrl = user?.avatar
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${user.id}/${user.avatar ?? ''}.png`
    : defaultAvatarUrl;
  const bannerUrl = user?.banner
    ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/banners/${user.id}/${user.banner ?? ''}.png`
    : '';

  const maskEmail = (email: string | undefined) => {
    if (!email) return '****@gmail.com';

    const [username, domain] = email.split('@');

    if (!username || username.length <= 2) {
      return `*@${String(domain)}`;
    }

    return `${email.slice(0, 2)}***@${String(domain)}`;
  };

  const handleLogout = () => {
    openModal('DANGER_CONFIRMATION', {
      title: 'Are you sure you want to logout?',
      body: 'You will remain on the same instance unless configured in the signup or login page.',
      onCancel: () => {
        closeModal();
      },
      onConfirm: () => {
        localStorage.removeItem('selectedAuthorization');
        localStorage.removeItem('selectedEmail');
        location.reload();
      },
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'My Account':
        return (
          <div className='settings-section'>
            <div className='settings-header'>
              <h1>My Account</h1>
            </div>
            {user?.banner && (
              <div className='banner-display' style={{ backgroundImage: `url(${bannerUrl})` }} />
            )}
            <div className='account-card'>
              <div className='account-info-grid'>
                <img src={avatarUrl} className='profile-picture' alt='Avatar' />
                <div className='account-info-wrapper'>
                  <div className='account-info-section'>
                    <div>
                      <p className='info-label'>USERNAME</p>
                      <p className='info-value'>
                        {user?.username ?? 'User'}
                        <span className='discriminator'>#{user?.discriminator ?? '0000'}</span>
                      </p>
                    </div>
                  </div>
                  <div className='account-info-section'>
                    <div>
                      <p className='info-label'>EMAIL</p>
                      <p className='info-value'>{maskEmail(user?.email ?? undefined)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='account-card' style={{ marginTop: '-20px' }}>
              <div className='account-info-grid'>
                <div className='account-info-wrapper'>
                  <div className='account-info-section'>
                    <div>
                      <p className='info-label'>GLOBAL NAME</p>
                      <p className='info-value'>{user?.global_name ?? user?.username}</p>
                    </div>
                  </div>
                  <div className='account-info-section'>
                    <div>
                      <p className='info-label'>PRONOUNS</p>
                      <p className='info-value'>{user?.pronouns ?? 'Not set'}</p>
                    </div>
                  </div>
                  <div className='account-info-section'>
                    <div>
                      <p className='info-label'>ABOUT ME</p>
                      <p className='info-value'>{user?.bio || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                className='edit-btn'
                style={{
                  width: '100%',
                }}
                onClick={() => {
                  setEditingProfile(!editingProfile);
                }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        );
      case 'Developer Options':
        return (
          <div className='settings-section'>
            <div className='settings-header'>
              <h1>Developer Options</h1>
            </div>
            <div className='account-card'>
              <div className='account-info-grid'>
                <div className='account-info-wrapper'>
                  <div key='popout-console'>
                    <div className='account-info-section'>
                      <p className='info-label'>Popout console</p>
                      <p className='info-value'>
                        <input
                          type={'checkbox'}
                          className='info-checkbox'
                          checked={devSettings.popout_console}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...devSettings,
                              popout_console: e.target.checked,
                            };

                            setDevSettings(updatedSettings);

                            localStorage.setItem(
                              'developerSettings',
                              JSON.stringify(updatedSettings),
                            );
                          }}
                        ></input>
                      </p>
                    </div>
                    <div className='account-info-section'>
                      <p
                        className='info-value'
                        style={{
                          fontWeight: '400',
                          marginTop: '10px',
                        }}
                      >
                        Displays a console for easy logging that pops out of the client, and can be dragged/resized at will.
                      </p>
                    </div>
                  </div>
                  <div key='log-gateway'>
                    <div className='account-info-section'>
                      <p className='info-label'>Log Gateway</p>
                      <p className='info-value'>
                        <input
                          type={'checkbox'}
                          className='info-checkbox'
                          checked={devSettings.log_gateway}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...devSettings,
                              log_gateway: e.target.checked,
                            };

                            setDevSettings(updatedSettings);

                            localStorage.setItem(
                              'developerSettings',
                              JSON.stringify(updatedSettings),
                            );
                          }}
                        ></input>
                      </p>
                    </div>
                    <div className='account-info-section'>
                      <p
                        className='info-value'
                        style={{
                          fontWeight: '400',
                          marginTop: '10px',
                        }}
                      >
                        Logs gateway events, packets, data to the console.
                      </p>
                    </div>
                  </div>
                  <div key='webrtc-p2p'>
                    <div className='account-info-section'>
                      <p className='info-label'>WebRTC P2P</p>
                      <p className='info-value'>
                        <input
                          type={'checkbox'}
                          className='info-checkbox'
                          checked={devSettings.webrtc_p2p}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...devSettings,
                              webrtc_p2p: e.target.checked,
                            };

                            setDevSettings(updatedSettings);

                            localStorage.setItem(
                              'developerSettings',
                              JSON.stringify(updatedSettings),
                            );
                          }}
                        ></input>
                      </p>
                    </div>
                    <div className='account-info-section'>
                      <p
                        className='info-value'
                        style={{
                          fontWeight: '400',
                          marginTop: '10px',
                        }}
                      >
                        Enables usage of webrtc-p2p for voice calls.{' '}
                        <b>
                          This will expose your public IP to others in the call, re-consider before
                          enabling.
                        </b>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <></>;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className='settings-overlay'>
      <div className='settings-sidebar-wrapper'>
        <nav className='settings-sidebar'>
          <div className='search-bar-container'>
            <div className='search-bar'>
              <span className='material-symbols-rounded search-icon' style={{ fontSize: '20px' }}>
                search
              </span>
              <input type='text' placeholder='Search Settings' className='search-input' />
            </div>
          </div>

          <div className='sidebar-group'>
            <div className='sidebar-category'>User Settings</div>
            <button
              className={`sidebar-item ${activeTab === 'My Account' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('My Account');
              }}
            >
              My Account
            </button>
          </div>

          <div className='sidebar-group'>
            <div className='sidebar-category'>App Settings</div>
            <button
              className={`sidebar-item ${activeTab === 'Developer Options' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('Developer Options');
              }}
            >
              Developer Options
            </button>
          </div>

          <div className='divider-container'>
            <hr
              style={{
                height: '1px',
                boxShadow: 'var(--modifier-accent-outline-top)',
              }}
            />
          </div>

          <div className='sidebar-group'>
            <button className='sidebar-item logout' onClick={handleLogout}>
              Log Out
            </button>
          </div>

          <div className='divider-container'>
            <hr
              style={{
                height: '1px',
                boxShadow: 'var(--modifier-accent-outline-top)',
              }}
            />
          </div>

          <div className='version-info'>
            <span className='version-text'>Development 0.1.0</span>
          </div>
        </nav>
      </div>

      <div className='settings-content-wrapper'>
        <div className='settings-main-content'>{renderTab()}</div>
        <div className='close-btn-container'>
          <button className='close-btn' onClick={onClose}>
            <div className='close-circle'>
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                close
              </span>
            </div>
            <span className='esc-text'>ESC</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
