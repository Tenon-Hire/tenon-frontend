export type NormalizedApiError = {
  status: number | null;
  code?: string | null;
  message: string;
  action: 'retry' | 'refresh' | 'signin' | 'contact_support';
};
