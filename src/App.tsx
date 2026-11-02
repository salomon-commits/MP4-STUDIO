import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { QueueItem, ConversionSettings } from './types.ts';

const ACCEPTED_EXTENSIONS = 'video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.mpeg,.mpg,.3gp,.m4v,.ts,.mts,.m2ts,.ogv,.vob';

const formatSize = (n: number): string => {
  if (n < 1048576) {
    return `${(n / 1024).toFixed(0)} Ko`;
  }
  return `${(n / 1048576).toFixed(1)} Mo`;
};

const baseName = (s: string): string => {
  return s.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 90) || 'video';
};

export default function App() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [engineState, setEngineState] = useState<string>('Le moteur sera chargé au premier lancement.');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [settings, setSettings] = useState<ConversionSettings>({
    quality: '23',
    resolution: '0',
    audio: '128'
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [queue]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    setQueue(prev => {
      const updated = [...prev];
      incoming.forEach(file => {
        if (!updated.some(f => f.name === file.name && f.size === file.size)) {
          updated.push({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            size: file.size,
            status: 'waiting',
            progress: 0,
            message: 'En attente'
          });
        }
      });
      return updated;
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setQueue(prev => {
      const target = prev.find(i => i.id === id);
      if (target?.url) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const loadEngine = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current && ffmpegRef.current.loaded) {
      return ffmpegRef.current;
    }
    setEngineState('Chargement du moteur FFmpeg…');
    const ff = new FFmpeg();

    ff.on('progress', ({ progress }: { progress: number }) => {
      const pct = Math.min(99, Math.round(progress * 100));
      setQueue(prev =>
        prev.map(item =>
          item.status === 'working' ? { ...item, progress: pct } : item
        )
      );
    });

    try {
      const core = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
      await ff.load({
        coreURL: await toBlobURL(`${core}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${core}/ffmpeg-core.wasm`, 'application/wasm')
      });
      ffmpegRef.current = ff;
      setEngineState('Moteur prêt. Conversion sur cet appareil.');
      return ff;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineState(`Erreur de chargement de FFmpeg : ${msg}`);
      throw err;
    }
  };

  const buildArgs = (inputFile: string, outputFile: string, currentSettings: ConversionSettings) => {
    const h = Number(currentSettings.resolution);
    const audio = currentSettings.audio;
    const a: string[] = [
      '-i', inputFile,
      '-map', '0:v:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', currentSettings.quality,
      '-pix_fmt', 'yuv420p'
    ];

    if (audio === 'none') {
      a.push('-an');
    } else {
      a.push('-map', '0:a:0?', '-c:a', 'aac', '-b:a', `${audio}k`);
    }

    if (h) {
      a.push(
        '-vf',
        `scale=w=if(gt(iw,ih),min(iw,(${h}*16/9)),-2):h=if(gt(ih,iw),min(ih,${h}),-2):force_original_aspect_ratio=decrease`
      );
    }

    a.push('-movflags', '+faststart', '-sn', outputFile);
    return a;
  };

  const handleConvert = async () => {
    if (busy) return;
    const waitingItems = queue.filter(item => item.status === 'waiting');
    if (waitingItems.length === 0) return;

    setBusy(true);

    try {
      const ff = await loadEngine();

      for (let i = 0; i < queue.length; i++) {
        const currentItem = queue[i];
        if (currentItem.status !== 'waiting') continue;

        // Mark current item working
        setQueue(prev =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: 'working', progress: 0, message: 'Préparation…' }
              : item
          )
        );

        const ext = (currentItem.name.split('.').pop() || 'dat')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') || 'dat';
        const src = `input_${i}.${ext}`;
        const dst = `converted_${i}.mp4`;

        try {
          const fileData = new Uint8Array(await currentItem.file.arrayBuffer());
          await ff.writeFile(src, fileData);

          setQueue(prev =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, message: 'Conversion en cours…' }
                : item
            )
          );

          const ffmpegArgs = buildArgs(src, dst, settings);
          await ff.exec(ffmpegArgs);

          const outputData = await ff.readFile(dst);
          // Handle Uint8Array or string
          const uint8 = outputData instanceof Uint8Array
            ? outputData
            : new TextEncoder().encode(outputData as string);

          const blob = new Blob([uint8.buffer as ArrayBuffer], { type: 'video/mp4' });
          const downloadUrl = URL.createObjectURL(blob);
          const outName = `${baseName(currentItem.name)}.mp4`;

          setQueue(prev =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'done',
                    progress: 100,
                    message: 'Conversion terminée',
                    url: downloadUrl,
                    outputName: outName
                  }
                : item
            )
          );

          try { await ff.deleteFile(src); } catch {}
          try { await ff.deleteFile(dst); } catch {}
        } catch (itemErr: unknown) {
          const errMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          setQueue(prev =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'error',
                    message: `Échec de conversion : ${errMsg.slice(0, 160)}`
                  }
                : item
            )
          );
          try { await ff.deleteFile(src); } catch {}
          try { await ff.deleteFile(dst); } catch {}
        }
      }
    } catch (engineErr: unknown) {
      const errStr = engineErr instanceof Error ? engineErr.message : String(engineErr);
      setEngineState(`Impossible de charger FFmpeg : ${errStr}`);
    } finally {
      setBusy(false);
    }
  };

  const hasWaiting = queue.some(f => f.status === 'waiting');
  const fileCountText = `${queue.length} fichier${queue.length > 1 ? 's' : ''}`;

  return (
    <div className="max-w-[1000px] mx-auto px-5 pt-[34px] pb-[60px]">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 font-extrabold tracking-tight">
          <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-[#9b8dff] to-[#5c4bd4] grid place-items-center text-white text-base shadow-sm">
            ▶
          </div>
          <span className="text-lg">MP4 STUDIO</span>
        </div>
        <span className="hidden sm:inline-block text-xs font-semibold text-[#c3bcff] border border-[#514a82] bg-[#292447] px-2.5 py-1 rounded-full uppercase tracking-wider">
          CONVERSION LOCALE
        </span>
      </header>

      {/* Hero Title & Subtitle */}
      <h1 className="text-[clamp(30px,5vw,46px)] leading-[1.1] tracking-[-1.5px] font-bold mb-3">
        Vos vidéos.<br />Un seul format.
      </h1>
      <p className="text-[#9ba7ba] max-w-[650px] mb-7 text-[15px] leading-relaxed">
        Convertissez vos fichiers vidéo en MP4 directement dans votre navigateur. Ajoutez plusieurs vidéos, choisissez la qualité, puis lancez la conversion.
      </p>

      {/* Main Conversion Panel */}
      <main className="bg-[#151a24]/95 border border-[#293244] rounded-[20px] p-[22px] shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
        {/* Dropzone */}
        <div
          className={`border-[1.5px] border-dashed rounded-[16px] min-h-[190px] grid place-items-center text-center p-6 bg-[#111722] transition-colors cursor-pointer ${
            isDragOver ? 'border-[#8b7cff] bg-[#211e39]' : 'border-[#515c76] hover:border-[#6c7b9e]'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div>
            <div className="text-[34px] leading-none mb-1 text-[#8b7cff]">＋</div>
            <strong className="block text-[17px] font-semibold text-[#f4f6fb]">
              Glissez-déposez vos vidéos ici
            </strong>
            <p className="text-[#9ba7ba] mt-1 mb-4 text-[13px]">
              ou sélectionnez des fichiers depuis votre appareil
            </p>
            <button
              type="button"
              className="border-0 rounded-[11px] px-4 py-2.5 font-bold cursor-pointer bg-[#8b7cff] hover:bg-[#7b6be8] text-white transition-colors text-[14px]"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choisir des vidéos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4.5">
          <div className="space-y-1.5">
            <label htmlFor="quality" className="block text-[#9ba7ba] text-xs font-medium">
              Qualité vidéo
            </label>
            <select
              id="quality"
              value={settings.quality}
              disabled={busy}
              onChange={(e) => setSettings(s => ({ ...s, quality: e.target.value }))}
              className="w-full bg-[#101620] text-[#f4f6fb] border border-[#354055] rounded-[10px] p-[11px] outline-none focus:border-[#8b7cff] transition-colors text-[14px] disabled:opacity-50"
            >
              <option value="18">Haute — meilleure qualité</option>
              <option value="23">Équilibrée — recommandée</option>
              <option value="28">Légère — fichier réduit</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="resolution" className="block text-[#9ba7ba] text-xs font-medium">
              Résolution maximale
            </label>
            <select
              id="resolution"
              value={settings.resolution}
              disabled={busy}
              onChange={(e) => setSettings(s => ({ ...s, resolution: e.target.value }))}
              className="w-full bg-[#101620] text-[#f4f6fb] border border-[#354055] rounded-[10px] p-[11px] outline-none focus:border-[#8b7cff] transition-colors text-[14px] disabled:opacity-50"
            >
              <option value="0">Conserver l'originale</option>
              <option value="1080">Full HD — 1080p</option>
              <option value="720">HD — 720p</option>
              <option value="480">480p</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="audio" className="block text-[#9ba7ba] text-xs font-medium">
              Audio
            </label>
            <select
              id="audio"
              value={settings.audio}
              disabled={busy}
              onChange={(e) => setSettings(s => ({ ...s, audio: e.target.value }))}
              className="w-full bg-[#101620] text-[#f4f6fb] border border-[#354055] rounded-[10px] p-[11px] outline-none focus:border-[#8b7cff] transition-colors text-[14px] disabled:opacity-50"
            >
              <option value="128">AAC — 128 kb/s</option>
              <option value="192">AAC — 192 kb/s</option>
              <option value="256">AAC — 256 kb/s</option>
              <option value="none">Sans audio</option>
            </select>
          </div>
        </div>

        {/* Queue Header */}
        <div className="flex items-center justify-between mt-6.5 mb-3">
          <h2 className="text-[16px] font-bold text-[#f4f6fb] m-0">Fichiers à convertir</h2>
          <span className="text-[#9ba7ba] text-xs">{fileCountText}</span>
        </div>

        {/* Queue Items */}
        <div className="grid gap-2.5">
          {queue.length === 0 ? (
            <div className="p-6 text-center text-[#9ba7ba] border border-[#293244] rounded-[13px] bg-[#111722]/50 text-[14px]">
              Aucun fichier ajouté pour le moment.
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[42px_minmax(0,1fr)] sm:grid-cols-[42px_minmax(0,1fr)_auto] gap-3 items-center bg-[#111722] border border-[#293244] rounded-[13px] p-3 transition-colors"
              >
                {/* File icon */}
                <div className="w-[42px] h-[42px] bg-[#24213f] text-[#8b7cff] rounded-[11px] grid place-items-center text-lg select-none">
                  ▣
                </div>

                {/* File info */}
                <div className="min-w-0">
                  <div className="font-semibold break-all text-[14px] text-[#f4f6fb]">
                    {item.name}
                  </div>
                  <div className="text-[#9ba7ba] text-xs mt-0.5">
                    {formatSize(item.size)}
                  </div>
                  <div
                    className={`text-xs mt-0.5 font-medium ${
                      item.status === 'done'
                        ? 'text-[#50d6a0]'
                        : item.status === 'error'
                        ? 'text-[#ff6e7a]'
                        : item.status === 'working'
                        ? 'text-[#8b7cff]'
                        : 'text-[#9ba7ba]'
                    }`}
                  >
                    {item.message ||
                      (item.status === 'waiting'
                        ? 'En attente'
                        : item.status === 'working'
                        ? 'Conversion en cours…'
                        : item.status === 'done'
                        ? 'Conversion terminée'
                        : 'Échec de conversion')}
                  </div>
                  <div className="h-[5px] bg-[#2a3241] rounded-[8px] overflow-hidden mt-1.5 w-full">
                    <span
                      className="block h-full bg-[#8b7cff] transition-all duration-200"
                      style={{ width: `${item.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 sm:col-span-1 flex justify-end gap-2 mt-1 sm:mt-0">
                  {item.status === 'done' && item.url && (
                    <a
                      href={item.url}
                      download={item.outputName || 'video.mp4'}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-[8px] bg-[#8b7cff] hover:bg-[#7b6be8] text-white transition-colors cursor-pointer"
                    >
                      Télécharger
                    </a>
                  )}
                  {item.status === 'waiting' && !busy && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-[#252d3c] hover:bg-[#2e3748] border border-[#3a4559] text-[#f4f6fb] transition-colors cursor-pointer"
                    >
                      Retirer
                    </button>
                  )}
                  {item.status === 'error' && !busy && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-[#252d3c] hover:bg-[#2e3748] border border-[#3a4559] text-[#f4f6fb] transition-colors cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Bar: Engine State & Action Button */}
        <div className="flex items-center justify-between gap-3.5 mt-4.5 flex-wrap">
          <span className="text-[#9ba7ba] text-xs">
            {engineState}
          </span>
          <button
            type="button"
            disabled={busy || !hasWaiting}
            onClick={handleConvert}
            className="w-full sm:w-auto border-0 rounded-[11px] px-5 py-2.5 font-bold cursor-pointer bg-[#8b7cff] hover:bg-[#7b6be8] text-white transition-colors disabled:opacity-45 disabled:cursor-not-allowed text-[15px]"
          >
            {busy ? 'Conversion…' : 'Convertir en MP4'}
          </button>
        </div>

        {/* Notice */}
        <div className="text-xs text-[#c2c9d7] bg-[#111722] border border-[#293244] rounded-[12px] p-3.5 mt-4.5 leading-relaxed">
          <b>Confidentialité :</b> vos fichiers sont traités localement dans votre navigateur et ne sont pas envoyés sur un serveur. Le moteur FFmpeg est chargé depuis des ressources publiques. Les vidéos restent sur votre appareil.
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[#687488] text-[11px] mt-6">
        MP4 STUDIO · Conversion vidéo dans le navigateur
      </footer>
    </div>
  );
}
