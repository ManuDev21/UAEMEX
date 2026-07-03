import Swal from 'sweetalert2';

const isDark = () => document.documentElement.classList.contains('dark');

const base = () => ({
  background: isDark() ? '#0f172a' : '#ffffff',
  color: isDark() ? '#e2e8f0' : '#0f172a',
});

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
});

export const alerts = {
  success: (title: string, text?: string) =>
    toast.fire({ icon: 'success', title, text, ...base() }),
  error: (title: string, text?: string) =>
    toast.fire({ icon: 'error', title, text, ...base() }),
  info: (title: string, text?: string) =>
    toast.fire({ icon: 'info', title, text, ...base() }),
  warning: (title: string, text?: string) =>
    toast.fire({ icon: 'warning', title, text, ...base() }),
  confirm: async (title: string, text?: string) => {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#006e54',
      cancelButtonColor: '#64748b',
      ...base(),
    });
    return result.isConfirmed;
  },
};
