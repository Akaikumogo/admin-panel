import { useRef, useState } from 'react';
import { Button, message, Progress, Tag } from 'antd';
import { UploadCloud, X } from 'lucide-react';
import apiService, { BACKEND_ORIGIN } from '@/services/api';

type MediaKind = 'audio' | 'video' | 'image';

const ACCEPT: Record<MediaKind, string> = {
  audio: 'audio/*,.mp3,.m4a,.aac,.ogg,.oga,.wav,.webm,.opus,.flac',
  video: 'video/*,.mp4,.m4v,.mov,.webm,.mkv,.3gp',
  image: 'image/*',
};

const LABEL: Record<MediaKind, string> = {
  audio: 'Audio',
  video: 'Video',
  image: 'Rasm',
};

interface MediaUploaderProps {
  kind: MediaKind;
  value?: string | null;
  onChange: (url: string) => void;
  placeholder?: string;
}

export default function MediaUploader({ kind, value, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fullUrl = (url?: string | null) => {
    if (!url) return '';
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`;
    return `${BACKEND_ORIGIN}/${url}`;
  };

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      let res;
      if (kind === 'audio') {
        res = await apiService.adminUploadAudio(file, setProgress);
      } else if (kind === 'video') {
        res = await apiService.adminUploadVideo(file, setProgress);
      } else {
        res = await apiService.adminUploadImage(file, setProgress);
      }
      onChange(res.url);
      message.success(`${LABEL[kind]} yuklandi`);
    } catch {
      message.error(`${LABEL[kind]} yuklashda xato`);
    } finally {
      setUploading(false);
    }
  };

  const preview = fullUrl(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          icon={<UploadCloud size={16} />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {LABEL[kind]} fayl tanlash
        </Button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            title="Tozalash"
          >
            <X size={14} /> Tozalash
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[kind]}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {uploading && (
        <Progress
          percent={progress}
          size="small"
          status={progress === 100 ? 'success' : 'active'}
        />
      )}

      {!uploading && value && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-2 flex items-center gap-2">
            <Tag color="green">{LABEL[kind].toUpperCase()} ✓</Tag>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[260px]">
              {value}
            </span>
          </div>
          {kind === 'audio' ? (
            <audio controls preload="metadata" src={preview} className="w-full" />
          ) : kind === 'video' ? (
            <video
              controls
              preload="metadata"
              src={preview}
              className="max-h-60 w-full rounded-lg bg-black"
            />
          ) : (
            <img
              src={preview}
              alt="preview"
              className="max-h-48 rounded-lg object-contain"
            />
          )}
        </div>
      )}

      {!value && !uploading && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {kind === 'audio' && 'MP3, M4A, OGG, WAV formatlari qabul qilinadi (max 100MB)'}
          {kind === 'video' && 'MP4, MOV, WEBM formatlari qabul qilinadi (max 500MB)'}
          {kind === 'image' && 'JPG, PNG, WEBP formatlari qabul qilinadi (max 10MB)'}
        </p>
      )}
    </div>
  );
}
