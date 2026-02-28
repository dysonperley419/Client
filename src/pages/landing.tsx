import './landing.css';

import { type JSX, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import openClientArrow from '../assets/arrow.png';
import flickerLogo from '../assets/flickerLogo.png';
import githubLogo from '../assets/github.png';

const modules = import.meta.glob('../assets/client-preview*.{png,jpg,jpeg,webp}', {
  eager: true,
});

const hasDefaultExport = (value: unknown): value is { default: string } =>
  typeof value === 'object' &&
  value !== null &&
  'default' in value &&
  typeof (value as { default?: unknown }).default === 'string';

const PREVIEW_IMAGES = Object.values(modules)
  .map((mod): string => {
    if (typeof mod === 'string') return mod;
    if (hasDefaultExport(mod)) return mod.default;
    return '';
  })
  .filter((path): path is string => path.length > 0);

PREVIEW_IMAGES.sort((a, b) => {
  const numA = parseInt(/\d+/.exec(a)?.[0] ?? '0', 10);
  const numB = parseInt(/\d+/.exec(b)?.[0] ?? '0', 10);
  return numA - numB;
});

const Landing = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [currentImg, setCurrentImg] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const { left, top, width, height } = containerRef.current.getBoundingClientRect();

    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    setTilt({ x: y * -30, y: x * 30 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const nextImg = () => {
    setCurrentImg((prev) => (prev + 1) % PREVIEW_IMAGES.length);
  };
  const prevImg = () => {
    setCurrentImg((prev) => (prev - 1 + PREVIEW_IMAGES.length) % PREVIEW_IMAGES.length);
  };

  return (
    <div className='landing-wrapper'>
      {isZoomed && (
        <div
          className='image-modal-overlay'
          onClick={() => {
            setIsZoomed(false);
          }}
        >
          <div className='modal-content'>
            <img src={PREVIEW_IMAGES[currentImg] ?? ''} alt='Preview Full' />
            <p className='modal-hint'>CLICK ANYWHERE TO CLOSE</p>
          </div>
        </div>
      )}

      <nav className='landing-navbar'>
        <div
          className='brand'
          style={{
            position: 'inherit',
          }}
        >
          <img src={flickerLogo} alt='' className='brand-logo' />
          <span>FLICKER</span>
        </div>
        <div className='navbar-links'>
          <Link title='Open Client' to='/login' className='nav-icon-link'>
            <img src={openClientArrow} alt='Login' />
          </Link>
          <a
            title='GitHub'
            href='https://github.com/FlickerTeam/Client'
            target='_blank'
            rel='noreferrer'
            className='nav-icon-link'
          >
            <img src={githubLogo} alt='GitHub' />
          </a>
        </div>
      </nav>

      <main className='landing-body'>
        <section className='hero-section'>
          <div
            className='hero-visual'
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <button className='carousel-btn left' onClick={prevImg}>
              <span className='material-symbols-rounded'>chevron_left</span>
            </button>
            <div
              className='image-3d-container'
              onClick={() => {
                setIsZoomed(true);
              }}
            >
              <img
                src={PREVIEW_IMAGES[currentImg] ?? ''}
                alt='Flicker Client'
                className='client-render'
                style={{
                  transform: `rotateX(${String(tilt.x)}deg) rotateY(${String(tilt.y)}deg)`,
                }}
              />
            </div>
            <button className='carousel-btn right' onClick={nextImg}>
              <span className='material-symbols-rounded'>chevron_right</span>
            </button>
            <div className='hero-text-overlay'>
              <h1>SLEEK</h1>
              <h2>FAST</h2>
              <h3>MODERN</h3>
            </div>
          </div>

          <div className='hero-copy'>
            <p className='tagline'>The only client you need</p>
            <div className='separator'></div>
            <div className='description'>
              <p>
                Flicker is designed to be a drop in daily driver for those wishing to jump ship from
                Discord to Spacebar/Oldcord instances.
              </p>
              <p>
                It is based on the UX discord had during its best years in 2017-2018, designed &
                developed by the very same people who made{' '}
                <Link to='https://oldcordapp.com' className='landing-link' target='__blank'>
                  Oldcord
                </Link>
                .
              </p>
              <p>Completely free, open-source, and maintained by the Community.</p>
            </div>
          </div>
        </section>

        <section className='features-section'>
          <h2 className='section-title'>Want features? We got em.</h2>
          <div className='landing-features'>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>Direct Messaging</p>
              </div>
            </div>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>Voice (Confirmed working on Oldcord)</p>
              </div>
            </div>
          </div>
          <div className='landing-features' style={{ marginTop: '15px' }}>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>Emoji, role, user, mention auto-complete</p>
              </div>
            </div>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>Account, Instance Switching</p>
              </div>
            </div>
          </div>
          <div className='landing-features' style={{ marginTop: '15px' }}>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>User Settings</p>
              </div>
            </div>
            <div className={`feature-item`}>
              <div className='feature-header'>
                <span className='material-symbols-rounded'>check_circle</span>
                <p>Developer accessible features (Console, logging)</p>
              </div>
            </div>
          </div>
          <h2
            className='section-title'
            style={{
              marginTop: '30px',
            }}
          >
            .. And more! You can find all details on our github
          </h2>
        </section>
        <div className='whatcha-waitin-for'>
          <p>Knowing all that, what are you waiting for? </p>
          <div className='try-it-wrapper'>
            <Link to='/register' className='primary-btn landing-cta'>
              TRY IT HERE
            </Link>
          </div>
        </div>
      </main>
      <footer className='landing-footer'>
        <div className='footer-main'>
          <p>
            &copy; 2026{' '}
            <Link to='https://github.com/FlickerTeam' target='_blank' rel='noreferrer'>
              Flicker Team
            </Link>
            . All rights reserved.
          </p>
        </div>
        <div className='footer-attribution'>
          <span>Icons by: </span>
          <Link
            to='https://www.flaticon.com/free-icons/arrows'
            title='arrows icons'
            target='__blank'
          >
            Pixel perfect
          </Link>
          <span className='dot'>•</span>
          <Link
            to='https://www.flaticon.com/free-icons/github'
            title='github icons'
            target='__blank'
          >
            riajulislam
          </Link>
          <span className='dot'>•</span>
          <Link to='https://www.flaticon.com/' title='Flaticon' target='__blank'>
            Flaticon
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
