import './dmChannel.css';

import { type JSX } from 'react';

export const DmChannel = ({
  icon,
  title,
  subtitle,
  selected,
  status,
  onClick,
  onClose,
}: {
  icon: string | JSX.Element;
  title: string;
  selected: boolean;
  status: string;
  subtitle?: string;
  onClick: () => void;
  onClose: () => void;
}) => (
  <div className={`dm-card ${selected ? 'selected-dm' : ''}`} onClick={onClick}>
    <div className='dm-card-icon'>
      {typeof icon === 'string' ? <img src={icon} alt='' /> : icon}
      <div className={`fr-status-dot ${status}`} title={status}></div>
    </div>
    <div className='dm-card-info'>
      <div className='dm-card-title'>{title}</div>
      {subtitle && <div className='dm-card-subtitle'>{subtitle}</div>}
    </div>
    <button
      className='exit-btn'
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <span className='material-symbols-rounded dm-card-arrow close-dm-btn'>close</span>
    </button>
  </div>
);
