import * as React from 'react';
import {
  useForm,
  useWatch,
  FormProvider,
  useFormContext,
  Controller,
  useFieldArray,
  type FieldValues,
  type UseFormReturn,
  type RegisterOptions,
  type Path,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type AntdRule = RegisterOptions & { message?: string; type?: string };

export type FormInstance<T extends FieldValues = FieldValues> = UseFormReturn<T> & {
  resetFields: () => void;
  setFieldsValue: (values: Partial<T>) => void;
  getFieldValue: (name: string) => unknown;
  getFieldsValue: () => T;
  validateFields: () => Promise<any>;
  submit: () => void;
};

const FormContext = React.createContext<{ layout?: 'vertical' | 'horizontal'; size?: string }>({});

function normalizeRules(rules?: RegisterOptions | AntdRule[]): RegisterOptions | undefined {
  if (!rules) return undefined;
  if (Array.isArray(rules)) {
    const merged: RegisterOptions = {};
    for (const r of rules) {
      if (r.required) merged.required = r.message ?? 'Majburiy maydon';
      if (r.min !== undefined) merged.min = { value: r.min as number, message: r.message ?? 'Qiymat juda kichik' };
      if (r.max !== undefined) merged.max = { value: r.max as number, message: r.message ?? 'Qiymat juda katta' };
      if (r.minLength !== undefined) merged.minLength = { value: r.minLength as number, message: r.message ?? 'Juda qisqa' };
      if (r.maxLength !== undefined) merged.maxLength = { value: r.maxLength as number, message: r.message ?? 'Juda uzun' };
      if (r.pattern) merged.pattern = r.pattern;
      if (r.type === 'email') {
        merged.pattern = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: r.message ?? 'Email noto\'g\'ri' };
      }
    }
    return merged;
  }
  return rules;
}

function wrapForm<T extends FieldValues>(form: UseFormReturn<T>): FormInstance<T> {
  return Object.assign(form, {
    resetFields: () => form.reset(),
    setFieldsValue: (values: Partial<T>) => {
      for (const [key, value] of Object.entries(values)) {
        form.setValue(key as Path<T>, value as T[Path<T>]);
      }
    },
    getFieldsValue: () => form.getValues(),
    getFieldValue: (name: string) => form.getValues(name as Path<T>),
    setFieldValue: (name: string, value: unknown) => form.setValue(name as Path<T>, value as T[Path<T>]),
    validateFields: async (): Promise<any> => {
      const valid = await form.trigger();
      if (!valid) throw form.formState.errors;
      return form.getValues();
    },
    submit: () => {
      void form.handleSubmit(() => undefined)();
    },
  });
}

function normalizeName(name: string | (string | number)[]): string {
  return Array.isArray(name) ? name.join('.') : name;
}

function FormList({
  name,
  children,
}: {
  name: string;
  children: (
    fields: { key: number; name: number }[],
    ops: { add: (defaultValue?: unknown) => void; remove: (i: number) => void },
  ) => React.ReactNode;
}) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: name as never });
  const mapped = fields.map((_, i) => ({ key: i, name: i }));
  return <>{children(mapped, { add: (defaultValue?: unknown) => append((defaultValue ?? {}) as never), remove })}</>;
}

function FormItem({
  name,
  label,
  rules,
  children,
  className,
  valuePropName,
  hidden,
  initialValue,
  extra,
  noStyle,
}: {
  name?: string | (string | number)[];
  label?: React.ReactNode;
  rules?: RegisterOptions | AntdRule[];
  children: React.ReactElement;
  className?: string;
  valuePropName?: string;
  hidden?: boolean;
  initialValue?: unknown;
  extra?: React.ReactNode;
  noStyle?: boolean;
}) {
  if (!name) return <div className={className}>{children}</div>;
  const fieldName = normalizeName(name);
  const { control } = useFormContext();
  const { layout } = React.useContext(FormContext);
  const error = useFormContext().formState.errors[fieldName];

  if (hidden) return null;

  return (
    <div className={cn(noStyle ? undefined : layout === 'vertical' ? 'space-y-2' : 'grid grid-cols-[120px_1fr] items-start gap-4', className)}>
      {label && !noStyle ? <Label htmlFor={fieldName}>{label}</Label> : null}
      <div className="space-y-1">
        <Controller
          name={fieldName as Path<FieldValues>}
          control={control}
          defaultValue={initialValue}
          rules={normalizeRules(rules)}
          render={({ field }) => {
            const childProps: Record<string, unknown> = { id: fieldName };
            if (valuePropName === 'checked') {
              childProps.checked = !!field.value;
              childProps.onCheckedChange = field.onChange;
            } else {
              childProps.value = field.value ?? '';
              childProps.onChange = (e: unknown) => {
                const val =
                  e && typeof e === 'object' && 'target' in (e as object)
                    ? (e as React.ChangeEvent<HTMLInputElement>).target.value
                    : e;
                field.onChange(val);
                (children.props as { onChange?: (v: unknown) => void }).onChange?.(val);
              };
            }
            return React.cloneElement(children, childProps);
          }}
        />
        {error?.message ? <p className="text-xs text-destructive">{String(error.message)}</p> : null}
        {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
      </div>
    </div>
  );
}

function FormComponent<T extends FieldValues>({
  form: externalForm,
  onFinish,
  onFinishFailed,
  layout = 'vertical',
  size,
  children,
  className,
  initialValues,
  onFieldsChange,
  ...props
}: {
  form?: FormInstance<T>;
  onFinish?: (values: T) => void | Promise<void>;
  onFinishFailed?: (errors: unknown) => void;
  layout?: 'vertical' | 'horizontal';
  size?: string;
  children: React.ReactNode;
  className?: string;
  initialValues?: Partial<T>;
  onFieldsChange?: () => void;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>) {
  void size;
  const internalForm = wrapForm(useForm<T>({ defaultValues: initialValues as T }));
  const form = externalForm ?? internalForm;

  return (
    <FormProvider {...form}>
      <FormContext.Provider value={{ layout, size }}>
        <form
          className={cn('space-y-4', className)}
          onSubmit={form.handleSubmit(
            (values) => void onFinish?.(values),
            (errors) => onFinishFailed?.(errors),
          )}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    </FormProvider>
  );
}

function useFormAntd<T extends FieldValues>() {
  return [wrapForm(useForm<T>())] as const;
}

const Form = Object.assign(FormComponent, {
  Item: FormItem,
  List: FormList,
  useForm: useFormAntd,
  useWatch: (name: string, form?: FormInstance) => {
    if (form) return useWatch({ control: form.control, name: name as Path<FieldValues> });
    return useWatch({ name: name as Path<FieldValues> });
  },
});

export { Form };
