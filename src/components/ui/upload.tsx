import * as React from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type UploadFile = {
  uid: string;
  name: string;
  status?: 'done' | 'uploading' | 'error';
  originFileObj?: File;
};

export function Upload({
  beforeUpload,
  onChange,
  accept,
  multiple,
  children,
  maxCount,
  onRemove,
  fileList,
  className,
}: {
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  onChange?: (info: { fileList: UploadFile[] }) => void;
  accept?: string;
  multiple?: boolean;
  children?: React.ReactNode;
  fileList?: UploadFile[];
  className?: string;
  maxCount?: number;
  onRemove?: () => void;
}) {
  void maxCount;
  void onRemove;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list: UploadFile[] = [];
    for (const file of Array.from(files)) {
      const ok = beforeUpload ? await beforeUpload(file) : true;
      if (ok !== false) {
        list.push({
          uid: crypto.randomUUID(),
          name: file.name,
          status: 'done',
          originFileObj: file,
        });
      }
    }
    onChange?.({ fileList: [...(fileList ?? []), ...list] });
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div onClick={() => inputRef.current?.click()} className="cursor-pointer">
        {children ?? (
          <Button variant="outline" htmlType="button">
            <UploadIcon className="mr-2 h-4 w-4" />
            Fayl yuklash
          </Button>
        )}
      </div>
      {fileList?.length ? (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {fileList.map((f) => (
            <li key={f.uid}>{f.name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Dragger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Upload> & { className?: string }) {
  return (
    <Upload
      {...props}
      className={cn(
        'rounded-md border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/30',
        className,
      )}
    >
      {children}
    </Upload>
  );
}

Upload.Dragger = Dragger;
