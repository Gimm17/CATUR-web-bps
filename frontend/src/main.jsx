import 'bootstrap/dist/css/bootstrap.min.css';
import 'admin-lte/dist/css/adminlte.min.css';
import "leaflet/dist/leaflet.css";
import "./css/sweetalert.css";

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { showAlert, showToast } from './utils/alerts';

if (typeof window !== 'undefined') {
  window.alert = (message) => {
    showAlert(message);
  };
  window.toast = (message, options = {}) => showToast(message, options);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
