'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Play, Pause, SkipForward, SkipBack, Settings2, Bookmark, ExternalLink, RotateCcw, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export default function InstagramPlayerApp() {
  const searchParams = useSearchParams();
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [rawInput, setRawInput] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoAdvanceSec, setAutoAdvanceSec] = useState<number>(20);
  const [progress, setProgress] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const urlsParam = searchParams.get('urls');
    if (urlsParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(urlsParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaylist(parsed);
          setRawInput(parsed.join('\n'));
        }
      } catch (err) {
        console.error('Failed to parse query URLs:', err);
      }
    }
  }, [searchParams]);

  const sanitizeUrl = (url: string) => {
    const clean = url.trim().split('?')[0];
    return clean.endsWith('/') ? clean : `${clean}/`;
  };

  const handleStartQueue = () => {
    const items = rawInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('instagram.com/p/') || line.includes('instagram.com/reel/'))
      .map(sanitizeUrl);

    if (items.length === 0) {
      alert('Please enter valid Instagram Reel or Post URLs.');
      return;
    }

    setPlaylist(items);
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const nextPost = useCallback(() => {
    setCurrentIndex((prev) => (prev < playlist.length - 1 ? prev + 1 : 0));
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [playlist.length]);

  const prevPost = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : playlist.length - 1));
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [playlist.length]);

  useEffect(() => {
    if (playlist.length === 0) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else {
      const checkScript = setInterval(() => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
          clearInterval(checkScript);
        }
      }, 200);
      return () => clearInterval(checkScript);
    }
  }, [currentIndex, playlist]);

  useEffect(() => {
    if (!isPlaying || playlist.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - (progress / 100) * (autoAdvanceSec * 1000);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const durationMs = autoAdvanceSec * 1000;
      const calculatedProgress = Math.min((elapsed / durationMs) * 100, 100);

      setProgress(calculatedProgress);

      if (elapsed >= durationMs) {
        nextPost();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentIndex, autoAdvanceSec, playlist.length, nextPost, progress]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-4xl flex items-center justify-between pb-6 border-b border-neutral-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">InstaPlay</h1>
            <p className="text-xs text-neutral-400">Saved Collection Continuous Player</p>
          </div>
        </div>

        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Timer ({autoAdvanceSec}s)</span>
        </button>
      </header>

      {showConfig && (
        <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-medium">Auto-Advance Duration per Reel:</div>
          <div className="flex items-center gap-2">
            {[10, 15, 20, 30, 45, 60].map((seconds) => (
              <button
                key={seconds}
                onClick={() => {
                  setAutoAdvanceSec(seconds);
                  setProgress(0);
                  startTimeRef.current = Date.now();
                }}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  autoAdvanceSec === seconds ? 'bg-rose-600 text-white font-medium' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </div>
      )}

      {playlist.length === 0 ? (
        <div className="w-full max-w-xl space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl space-y-4">
            <label className="block text-sm font-medium text-neutral-200">
              Paste Instagram Reel / Post URLs (one per line)
            </label>
            <textarea
              rows={6}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"https://www.instagram.com/reel/C3M8WpAhy8s/\nhttps://www.instagram.com/p/C2188m_v7_a/"}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-rose-500 font-mono transition"
            />
            <button
              onClick={handleStartQueue}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 font-semibold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Playlist Player
            </button>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
              <Bookmark className="w-4 h-4" />
              1-Click Bookmarklet for Saved Collections
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Drag this button to your bookmarks bar. On your Instagram saved collection page, click it to auto-launch this player:
            </p>
            <a
              href={`javascript:(function(){const l=Array.from(document.querySelectorAll('a[href*="/p/"],a[href*="/reel/"]')).map(a=>a.href.split('?')[0]).filter((v,i,a)=>a.indexOf(v)===i);if(l.length){window.open('${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}?urls='+encodeURIComponent(JSON.stringify(l)),'_blank');}else{alert('No posts found. Open your Instagram saved collection first.');}})();`}
              onClick={(e) => e.preventDefault()}
              className="inline-block px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 cursor-grab"
            >
              📥 Grab Instagram Saved
            </a>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xl flex flex-col items-center space-y-4">
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Post {currentIndex + 1} of {playlist.length}</span>
              <a href={playlist[currentIndex]} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-rose-400">
                <span>Open in Instagram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div 
            key={playlist[currentIndex]} 
            className="w-full min-h-[580px] bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center p-2 shadow-2xl overflow-hidden"
          >
            <blockquote
              className="instagram-media"
              data-instgrm-captioned
              data-instgrm-permalink={playlist[currentIndex]}
              data-instgrm-version="14"
              style={{ background: '#000', borderRadius: '12px', margin: '0', width: '100%', maxWidth: '540px' }}
            />
          </div>

          <div className="flex items-center gap-4 py-2">
            <button onClick={prevPost} className="p-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full transition">
              <SkipBack className="w-4 h-4 text-neutral-200" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-4 bg-rose-600 hover:bg-rose-500 rounded-full transition">
              {isPlaying ? <Pause className="w-5 h-5 text-white fill-current" /> : <Play className="w-5 h-5 text-white fill-current ml-0.5" />}
            </button>
            <button onClick={nextPost} className="p-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full transition">
              <SkipForward className="w-4 h-4 text-neutral-200" />
            </button>
            <button onClick={() => { setPlaylist([]); setProgress(0); }} className="p-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full transition text-neutral-400">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
