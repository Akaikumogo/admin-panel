import { toast } from 'sonner';

type MessageArg = string | { content: string; key?: string };

function resolveContent(arg: MessageArg) {
  return typeof arg === 'string' ? arg : arg.content;
}

export const message = {
  success: (content: MessageArg) => toast.success(resolveContent(content)),
  error: (content: MessageArg) => toast.error(resolveContent(content)),
  info: (content: MessageArg) => toast.info(resolveContent(content)),
  warning: (content: MessageArg) => toast.warning(resolveContent(content)),
  loading: (content: MessageArg) => toast.loading(resolveContent(content)),
  destroy: (_key?: string) => toast.dismiss(),
};

export const notification = {
  success: (opts: { message: string; description?: string; placement?: string }) =>
    toast.success(opts.message, { description: opts.description }),
  error: (opts: { message: string; description?: string; duration?: number; placement?: string }) =>
    toast.error(opts.message, {
      description: opts.description,
      duration: opts.duration ? opts.duration * 1000 : undefined,
    }),
  info: (opts: { message: string; description?: string; placement?: string }) =>
    toast.info(opts.message, { description: opts.description }),
  warning: (opts: { message: string; description?: string; placement?: string }) =>
    toast.warning(opts.message, { description: opts.description }),
};
