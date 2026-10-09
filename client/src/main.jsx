import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No StrictMode: its double-mounted effects would request the camera twice
// and open duplicate peer connections during development.
createRoot(document.getElementById('root')).render(<App />);
