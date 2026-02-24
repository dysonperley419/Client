import { SuggestionsType, type Suggestion, type SuggestionsTrigger } from "@/types/suggestions";

interface SuggestionsBarProps {
    suggestionsTrigger: SuggestionsTrigger;
    filteredSuggestions: Suggestion[] | [];
    selectedIndex: number;
    applySuggestion: (item: any) => void;
    setSelectedIndex: (index: number) => void;
};

export const SuggestionsBar = ({ suggestionsTrigger, filteredSuggestions, selectedIndex, applySuggestion, setSelectedIndex }: SuggestionsBarProps) => {
    return (
        <>
            <div className='input-wrapper' key={'SuggestionsBar'}>
                <div className='input-row'>
                    {suggestionsTrigger != null && filteredSuggestions.length > 0 && (
                        <>
                            <div className='chat-suggestions-wrapper'>
                                {filteredSuggestions.map((item: Suggestion, index: number) => {
                                    const isUser = item.suggestionType === SuggestionsType.USER;
                                    const isRole = item.suggestionType === SuggestionsType.ROLE;
                                    const isEmoji = item.suggestionType === SuggestionsType.EMOJI;
                                    const isCommand = item.suggestionType === SuggestionsType.COMMAND;

                                    const prefix = (isUser || isRole) ? '@' : isEmoji ? ':' : isCommand ? '/' : '#';
                                    let name = '';
                                    let subtext = '';

                                    if (isUser && item.user) {
                                        name = item.user.nick || item.user.user.username;
                                        subtext =
                                            item.user.user.discriminator !== '0'
                                                ? `${item.user.user.username}#${item.user.user.discriminator}`
                                                : item.user.user.username;
                                    } else if (item.isSpecial) {
                                        name = item.name;
                                        subtext = item.description;
                                    } else if (isEmoji) {
                                        name = item.name;
                                        subtext = `Emoji from ${item.sourceGuildName || 'Unknown Server'}`;
                                    } else if (isRole) {
                                        name = item.name;
                                        subtext = 'Role';
                                    } else if (isCommand) {
                                        name = item.name;
                                        subtext = item.description;
                                    } else {
                                        const topic = item.channel?.topic || 'Channel';
                                        const maxTopicLength = 50;

                                        name = item.name;
                                        subtext =
                                            topic.length > maxTopicLength
                                                ? `${topic.substring(0, maxTopicLength)}...`
                                                : topic;
                                    }

                                    return (
                                        <div
                                            key={`suggestion-${index}`}
                                            className={`chat-suggestion ${index === selectedIndex ? 'active' : ''}`}
                                            style={{ '--prefix': `"${prefix}"` } as React.CSSProperties}
                                            onClick={() => {
                                                applySuggestion(item);
                                            }}
                                            onMouseEnter={() => {
                                                setSelectedIndex(index);
                                            }}
                                        >
                                            {isUser && item.user?.user.avatar && !item.isSpecial ? (
                                                <img
                                                    src={`${localStorage.getItem('selectedCdnUrl')}/avatars/${item.user.id}/${item.user.user.avatar}.png`}
                                                    className='avatar-img suggested-item-avi'
                                                />
                                            ) : isEmoji ? (
                                                <img
                                                    src={`${localStorage.getItem('selectedCdnUrl')}/emojis/${item.emoji?.id}.${item.emoji?.animated ? 'gif' : 'png'}`}
                                                    className='suggested-item-avi'
                                                    style={{ objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <div className='suggested-item-avi' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {!isUser && prefix}
                                                </div>
                                            )}
                                            <div className='chat-suggestion-item'>
                                                <span>{name}</span>
                                                <span>{subtext}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
};