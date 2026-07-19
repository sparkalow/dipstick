export interface Receipt {
  id: string;
  serviceRecordId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  addedAt: string;
}
