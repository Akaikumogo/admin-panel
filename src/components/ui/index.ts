/**
 * shadcn/ui components — Ant Design compatible exports for Elektro Learn admin panel.
 */
export { Button } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input, PasswordInput, InputNumber, Textarea } from './input-extras';
export { Label } from './label';
export { Tag } from './badge';
export { Progress } from './progress';
export { Spin, Spinner } from './spinner';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Select, SearchSelect, type SelectOption } from './search-select';
export { Table, type ColumnType, type DataTableProps } from './data-table';
export type ColumnsType<T = Record<string, unknown>> = import('./data-table').ColumnType<T>[];
export { Modal, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
export { Drawer, Sheet, SheetContent } from './sheet';
export { Form, type FormInstance } from './form';
export { Switch } from './switch';
export { Checkbox } from './checkbox';
export { Divider, Separator } from './separator';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Popconfirm, AlertDialog } from './alert-dialog';
export { DatePicker } from './date-picker';
export { Segmented } from './segmented-control';
export { Empty } from './empty';
export { Collapse, Accordion } from './accordion';
export { Upload, type UploadFile } from './upload';
export { Row, Col } from './grid';
export { List, Pagination, Timeline, Badge, Typography } from './misc';
export { Skeleton } from './skeleton';
export { Radio } from './radio';
export { Toaster } from './sonner';
export { message, notification } from '@/lib/toast';

export type DefaultOptionType = { value: string; label: React.ReactNode; disabled?: boolean };

import * as React from 'react';
