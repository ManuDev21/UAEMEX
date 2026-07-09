import axios from 'axios';
import { tokenStore } from './token';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const rest = axios.create({ baseURL: API_URL });

rest.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function downloadFile(path: string, filename: string) {
  const response = await rest.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadExcel(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await rest.post('/excel/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadPdfExtract(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await rest.post('/pdf/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  });
  return response.data as {
    rows: Record<string, string>[];
    headers: string[];
    totalRows: number;
    rawText: string;
  };
}

export async function uploadPdfToExcel(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await rest.post('/pdf/to-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
    timeout: 600000,
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', file.name.replace(/\.pdf$/i, '') + '.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadPdfImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await rest.post('/pdf/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  });
  return response.data as {
    filename: string;
    totalRows: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
}
