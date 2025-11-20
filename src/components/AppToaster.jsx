import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Duração padrão
        duration: 4000,
        
        // Estilo base para todos os toasts
        className: '!bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-white !border !border-slate-200 dark:!border-slate-800 !shadow-xl !rounded-xl !px-4 !py-3 !text-sm !font-medium',
        
        // Configurações específicas por tipo
        success: {
          iconTheme: {
            primary: '#10b981', // emerald-500
            secondary: '#fff',
          },
          style: {
            borderLeft: '4px solid #10b981',
          },
        },
        error: {
          iconTheme: {
            primary: '#e11d48', // rose-600
            secondary: '#fff',
          },
          style: {
            borderLeft: '4px solid #e11d48',
          },
        },
        loading: {
          iconTheme: {
            primary: '#0284c7', // sky-600
            secondary: '#fff',
          },
          style: {
            borderLeft: '4px solid #0284c7',
          },
        },
      }}
    />
  );
}