import axios from 'axios';

const GOOGLE_DRIVE_FOLDER_ID = '1YITWca2X8drkHqCbj5eFUo3K1noEi_cH';

// Fungsi untuk upload ke Google Drive
export const uploadToGoogleDrive = async (file, fileName) => {
  try {
    // Catatan: Anda perlu mengimplementasikan Google Drive API
    // Ini adalah contoh implementasi yang perlu disesuaikan
    
    // Opsi 1: Menggunakan Google Drive API v3
    // Anda perlu setup OAuth2 terlebih dahulu
    
    // Opsi 2: Menggunakan FormData ke backend yang akan handle upload ke Drive
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('folderId', GOOGLE_DRIVE_FOLDER_ID);
    
    // Kirim ke backend untuk diupload ke Google Drive
    const response = await axios.post('/api/upload-to-drive', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    return {
      success: true,
      webViewLink: response.data.webViewLink,
      id: response.data.id
    };
    
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
};