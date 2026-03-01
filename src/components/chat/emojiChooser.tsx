import './emojiChooser.css';

import parse from 'html-react-parser';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useConfig } from '@/context/configContext';
import { BUILTIN_EMOJI_CATEGORIES } from '@/generated/emojiCategories';
import type { Guild } from '@/types/guilds';
import { parseTwemojiWithLegacyOverrides } from '@/utils/emoji';

export interface Emoji {
  id?: string;
  name: string;
  animated?: boolean;
  require_colons?: boolean;
  isBuiltin?: boolean;
  unicode?: string;
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

  const builtinSections = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return BUILTIN_EMOJI_CATEGORIES.map((category) => ({
      ...category,
      sectionId: `__builtin_${category.id}__`,
      emojis: category.emojis
        .filter((emoji) => !searchQuery || emoji.name.toLowerCase().includes(lowerQuery))
        .map((emoji) => ({ ...emoji, isBuiltin: true as const })),
    })).filter((section) => section.emojis.length > 0);
  }, [searchQuery]);

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
  }, [builtinSections, guildsWithEmojis]);

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
          {builtinSections.map((section) => (
            <div
              key={section.sectionId}
              className='emoji-section'
              data-guild-id={section.sectionId}
              ref={(el) => {
                sectionRefs.current[section.sectionId] = el;
              }}
            >
              <div className='section-header section-header-builtin'>
                <span className='material-symbols-rounded'>{section.icon}</span>
                <span>{section.label.toUpperCase()}</span>
              </div>
              <div className='emoji-grid'>
                {section.emojis.map((emoji) => (
                  <div
                    key={`${emoji.name}-${emoji.unicode}`}
                    className='emoji-item emoji-item-builtin'
                    title={`:${emoji.name}:`}
                    onClick={() => {
                      onSelectEmoji(emoji);
                      onClose();
                    }}
                  >
                    <span className='emoji-builtin-preview'>
                      {parse(
                        parseTwemojiWithLegacyOverrides(emoji.unicode, {
                          className: 'emoji-builtin-img',
                        }),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className='emoji-picker-footer'>
          <div className='footer-nav-scroll scroller-horizontal'>
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
            {builtinSections.map((section) => (
              <span
                key={section.sectionId}
                className={`material-symbols-rounded nav-icon ${activeGuildId === section.sectionId ? 'active' : ''}`}
                title={section.label}
                onClick={() => {
                  scrollToGuild(section.sectionId);
                }}
              >
                {section.icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
