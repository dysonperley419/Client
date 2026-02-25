import './popoutProfile.css';

import { type JSX } from 'react';

import { useGateway } from '@/context/gatewayContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Member, Role } from '@/types/guilds';
import { useUiUtilityActions } from '@/utils/uiUtils';

import { useAssetsUrl } from '../../context/assetsUrl';
import { getDefaultAvatar } from '../../utils/avatar';

interface PopoutProfileProps {
  member: Member;
  roles: Role[] | null;
  contextGuildId: string | null;
}

export const PopoutProfile = ({
  member,
  roles,
  contextGuildId,
}: PopoutProfileProps): JSX.Element => {
  const { getPresence } = useGateway();
  const contextPerms = usePermissions(contextGuildId ?? '0');
  const status = getPresence(member.id)?.status ?? 'offline';
  const { openFullProfile } = useUiUtilityActions(null);

  const MemberAvatar = ({ member, className }: { member: Member; className: string }) => {
    const { url: defaultAvatarUrl, rollover } = useAssetsUrl(
      `/assets/${getDefaultAvatar(member.user) ?? ''}.png`,
    );
    const avatarUrl =
      member.avatar || member.user.avatar
        ? `${localStorage.getItem('selectedCdnUrl') ?? ''}/avatars/${member.id ?? member.user.id}/${member.user.avatar ?? ''}.png`
        : defaultAvatarUrl;

    return (
      <img
        src={avatarUrl || ''}
        alt={`${member.user.username}'s Avatar`}
        className={className}
        onError={() => {
          rollover();
        }}
      />
    );
  };

  const getRoleColor = (colorDecimal: number) => {
    if (!colorDecimal) {
      return 'rgba(185, 187, 190, 0.2)';
    }

    return `#${colorDecimal.toString(16).padStart(6, '0')}`;
  };

  const bannerUrl = member.user.banner
    ? `url('${localStorage.getItem('selectedCdnUrl') ?? ''}/banners/${member.user.id}/${member.user.banner}.png')`
    : 'none';

  const accentColor = member.user.accent_color
    ? `#${member.user.accent_color.toString(16).padStart(6, '0')}`
    : 'var(--bg-sidebar-secondary)';

  return (
    <div className='profile-popout-container'>
      <div
        className='popout-banner'
        style={{
          backgroundImage: bannerUrl,
          backgroundColor: bannerUrl === 'none' ? accentColor : undefined,
        }}
      />
      <div className='profile-popout-content'>
        <div className='popout-header'>
          <button
            className='avatar-wrapper-centered overlap'
            onMouseOver={(e) => {
              e.currentTarget.classList.add('avatar-img-text');
            }}
            onFocus={(e) => {
              e.currentTarget.classList.add('avatar-img-text');
            }}
            onBlur={(e) => {
              e.currentTarget.classList.remove('avatar-img-text');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.classList.remove('avatar-img-text');
            }}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();

              void openFullProfile(member);
            }}
          >
            <MemberAvatar member={member} className='avatar-img-large' />
            <div className={`status-dot-large ${status}`} title={status}></div>
          </button>
          <div className='user-details-centered'>
            <span className='username'>{member.user.global_name ?? member.user.username}</span>
            <span className='discriminator'>#{member.user.discriminator}</span>
            {member.user.bot && <span className='bot-tag'>Bot</span>}
          </div>
          {member.user.pronouns && (
            <div className='pronouns-row'>
              <span className='pronouns' title={`${member.user.username}'s pronouns`}>
                {member.user.pronouns}
              </span>
            </div>
          )}
        </div>
        {member.user.bio && (
          <>
            <hr className='popout-separator' />
            <div className='popout-section'>
              <span className='section-title'>ABOUT ME</span>
              <div className='about-me-container'>
                <p>{member.user.bio}</p>
              </div>
            </div>
          </>
        )}
        <hr className='popout-separator' />
        {(member.roles.length > 0 || contextPerms.canManageRoles) && (
          <div className='popout-section'>
            <span className='section-title'>ROLES</span>

            <div className='roles-container'>
              {member.roles.map((roleId: string) => {
                const role = roles?.find((r: Role) => r.id === roleId);
                if (!role) return null;

                const color = getRoleColor(role.color);

                return (
                  <div
                    key={roleId}
                    className='role-pill role-emphasis-border'
                    style={{
                      borderColor: color,
                      outlineColor: color,
                      background: `${color}22`,
                    }}
                  >
                    {contextPerms.canManageRoles && (
                      <span
                        className='role-removal-btn'
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        ×
                      </span>
                    )}
                    {role.name}
                  </div>
                );
              })}

              {contextPerms.canManageRoles && (
                <div className='add-role-btn'>+</div>
              )}
            </div>
          </div>
        )}
        <div className='popout-section'>
          <span className='section-title'>NOTE</span>
          <textarea className='note-input' placeholder='Click to add a note' />
        </div>
      </div>
    </div>
  );
};
