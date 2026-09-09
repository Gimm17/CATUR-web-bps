import Swal from "sweetalert2";

const swalBase = Swal.mixin({
  customClass: {
    popup: "swal-popup",
    title: "swal-title",
    confirmButton: "swal-confirm",
    cancelButton: "swal-cancel",
    input: "swal-input",
  },
  buttonsStyling: false,
});

export const showAlert = (message, options = {}) => {
  return swalBase.fire({
    icon: options.icon || "info",
    title: options.title || "Informasi",
    text: String(message ?? ""),
  });
};

export const confirmAction = async (message, options = {}) => {
  const result = await swalBase.fire({
    icon: options.icon || "question",
    title: options.title || "Konfirmasi",
    text: String(message ?? ""),
    showCancelButton: true,
    confirmButtonText: options.confirmText || "Ya",
    cancelButtonText: options.cancelText || "Batal",
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
};

export const promptInput = async (message, options = {}) => {
  const result = await swalBase.fire({
    icon: options.icon || "question",
    title: options.title || "Input",
    text: String(message ?? ""),
    input: options.input || "text",
    inputValue: options.defaultValue || "",
    inputPlaceholder: options.placeholder || "",
    inputAttributes: options.inputAttributes || {},
    showCancelButton: true,
    confirmButtonText: options.confirmText || "Simpan",
    cancelButtonText: options.cancelText || "Batal",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return null;
  return result.value;
};

export const showToast = (message, options = {}) => {
  return swalBase.fire({
    toast: true,
    position: options.position || "top-end",
    icon: options.icon || "success",
    title: String(message ?? ""),
    showConfirmButton: false,
    timer: options.timer || 2500,
    timerProgressBar: true,
    showCloseButton: true,
  });
};
