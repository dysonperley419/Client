import { useState } from 'react';

export interface GifCategory {
  name: string;
  src: string;
}

export interface Gif {
  id: string;
  fullUrl: string;
  previewUrl: string;
  title: string;
}

interface GifSearcherProps {
  gifCategories: GifCategory[];
  gifs: Gif[];
  onSearch: (term: string) => Promise<void>;
  onSelectGif: (url: string) => void;
  onClose: () => void;
}

export const GifSearcher9000 = ({
  gifCategories,
  gifs,
  onSearch,
  onSelectGif,
  onClose,
}: GifSearcherProps) => {
  const [gifSearchQuery, setGifSearchQuery] = useState('');

  const handleInputChange = (val: string) => {
    setGifSearchQuery(val);
    void onSearch(val);
  };

  return (
    <div className='input-wrapper' key={'GifSearcher9000'}>
      <div className='gif-picker-container'>
        <div className='gif-picker-header'>
          <div className='search-bar'>
            <input
              type='text'
              placeholder='Search Tenor'
              value={gifSearchQuery}
              onChange={(e) => {
                handleInputChange(e.currentTarget.value);
              }}
            />
            <span className='material-symbols-rounded search-icon'>search</span>
          </div>
        </div>
        <div className='gif-picker-content scroller'>
          {/* Categories View */}
          {!gifSearchQuery && gifCategories.length > 0 && (
            <div className='gif-category-grid'>
              {gifCategories.map((cat) => (
                <div
                  key={cat.name}
                  className='category-item'
                  onClick={() => {
                    handleInputChange(cat.name);
                  }}
                >
                  <img src={cat.src} alt={cat.name} />
                  <div className='category-label'>{cat.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid */}
          <div className='gif-grid'>
            {gifs.map((gif) => (
              <div
                key={gif.id}
                className='gif-item'
                onClick={() => {
                  onSelectGif(gif.fullUrl);
                  onClose();
                  setGifSearchQuery('');
                }}
              >
                <img src={gif.previewUrl} alt={gif.title} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
