import Swal, { SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Modern styled OmniPOS SweetAlert2 instance
export const OmniSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-3xl shadow-2xl border border-slate-200 p-6 font-sans bg-white',
    title: 'text-base font-extrabold text-slate-900',
    htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-2',
    confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-md mx-1.5 transition-colors cursor-pointer',
    cancelButton: 'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 mx-1.5 transition-colors cursor-pointer',
    denyButton: 'px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md mx-1.5 transition-colors cursor-pointer',
  },
  buttonsStyling: false,
});

export const showToast = (title: string, icon: SweetAlertIcon = 'success') => {
  return OmniSwal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    icon,
    title,
    customClass: {
      popup: 'rounded-2xl shadow-xl border border-slate-200 p-3 text-xs font-semibold bg-white text-slate-800',
    },
  });
};

export const showAlert = async (
  title: string,
  text?: string,
  icon: SweetAlertIcon = 'info',
  confirmButtonText = 'OK'
) => {
  return OmniSwal.fire({
    title,
    text,
    icon,
    confirmButtonText,
  });
};

export const showSuccess = async (title: string, text?: string) => {
  return showAlert(title, text, 'success', 'ကောင်းပါပြီ (OK)');
};

export const showError = async (title: string, text?: string) => {
  return showAlert(title, text, 'error', 'နားလည်ပါပြီ (Understood)');
};

export const showWarning = async (title: string, text?: string) => {
  return showAlert(title, text, 'warning', 'သဘောတူပါသည် (OK)');
};

export const showConfirm = async (options: {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDangerous?: boolean;
}): Promise<boolean> => {
  const result = await OmniSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? (options.isDangerous ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? (options.isDangerous ? 'သေချာပါသည် (Yes)' : 'အတည်ပြုမည် (Confirm)'),
    cancelButtonText: options.cancelButtonText ?? 'မလုပ်ဆောင်ပါ (Cancel)',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200 p-6 font-sans bg-white',
      title: 'text-base font-extrabold text-slate-900',
      htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-2',
      confirmButton: options.isDangerous
        ? 'px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md mx-1.5 transition-colors cursor-pointer'
        : 'px-5 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-md mx-1.5 transition-colors cursor-pointer',
      cancelButton: 'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 mx-1.5 transition-colors cursor-pointer',
    },
  });
  return result.isConfirmed;
};

export const confirmDialog = async (
  title: string,
  text?: string,
  confirmButtonText = 'သေချာပါသည် (Yes)',
  cancelButtonText = 'မလုပ်တော့ပါ (Cancel)'
): Promise<boolean> => {
  return showConfirm({
    title,
    text,
    confirmButtonText,
    cancelButtonText,
    isDangerous: true,
  });
};
