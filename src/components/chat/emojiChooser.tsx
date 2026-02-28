import './emojiChooser.css';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useConfig } from '@/context/configContext';
import type { Guild } from '@/types/guilds';

export interface Emoji {
  id: string;
  name: string;
  animated?: boolean;
  require_colons?: boolean;
}

interface EmojiChooserProps {
  guilds: Guild[];
  onSelectEmoji: (emoji: Emoji) => void;
  onClose: () => void;
}

export const EmojiChooser = ({ guilds, onSelectEmoji, onClose }: EmojiChooserProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);
  const { cdnUrl } = useConfig();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const guildsWithEmojis = useMemo(() => {
    return guilds
      .map((g) => ({
        ...g,
        emojis: searchQuery
          ? g.emojis?.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
          : g.emojis,
      }))
      .filter((g) => g.emojis && g.emojis.length > 0);
  }, [guilds, searchQuery]);

  const scrollToGuild = (guildId: string) => {
    const target = sectionRefs.current[guildId];

    if (target && scrollContainerRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => {
    const observerOptions = {
      root: scrollContainerRef.current,
      threshold: 0.5,
      rootMargin: '-10% 0px -20% 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveGuildId(entry.target.getAttribute('data-guild-id'));
        }
      });
    }, observerOptions);

    const currentRefs = sectionRefs.current;

    Object.values(currentRefs).forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [guildsWithEmojis]);

  return (
    <div className='input-wrapper' key={'EmojiChooser9000'}>
      <div className='emoji-picker-container'>
        <div className='emoji-picker-header'>
          <div className='search-bar'>
            <input
              type='text'
              placeholder='Search emojis'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
            <span className='material-symbols-rounded search-icon'>search</span>
          </div>
        </div>

        <div className='emoji-picker-content scroller' ref={scrollContainerRef}>
          {guildsWithEmojis.map((guild) => (
            <div
              key={guild.id}
              className='emoji-section'
              data-guild-id={guild.id}
              ref={(el) => {
                sectionRefs.current[guild.id] = el;
              }}
            >
              <div className='section-header'>{guild.name.toUpperCase()}</div>
              <div className='emoji-grid'>
                {guild.emojis?.map((emoji) => (
                  <div
                    key={emoji.id}
                    className='emoji-item'
                    title={`:${emoji.name}:`}
                    onClick={() => {
                      onSelectEmoji(emoji);
                      onClose();
                    }}
                  >
                    <img
                      src={`${cdnUrl ?? ''}/emojis/${emoji.id}.png`}
                      alt={emoji.name}
                      loading='lazy'
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className='emoji-picker-footer'>
          <div className='footer-nav-scroll scroller-horizontal'>
            {/* 
                        <span className={`material-symbols-rounded nav-icon ${!activeGuildId ? 'active' : ''}`}>
                            schedule
                        </span>
                         // uuhh still gotta figure recent emoji history out */}
            {guildsWithEmojis.map((guild) => (
              <div
                key={guild.id}
                className={`nav-guild-icon ${activeGuildId === guild.id ? 'active' : ''}`}
                title={guild.name}
                onClick={() => {
                  scrollToGuild(guild.id);
                }}
              >
                {guild.icon ? (
                  <img
                    src={`${cdnUrl ?? ''}/icons/${guild.id}/${guild.icon}.png`}
                    alt={`${guild.name} icon`}
                    loading='lazy'
                  />
                ) : (
                  <div className='icon-fallback'>{guild.name[0]}</div>
                )}
              </div>
            ))}

            {/*
                            <span className='material-symbols-rounded nav-icon'>mood</span>
                        <span className='material-symbols-rounded nav-icon'>set_meal</span>
                        <span className='material-symbols-rounded nav-icon'>sports_esports</span>
                            // we still have to add normal emojis so until then, this is commented out. */}
          </div>
        </div>
      </div>
    </div>
  );
};
