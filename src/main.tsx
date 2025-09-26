import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// Ensure scheduled message service starts in browser
import './lib/scheduled-message-service'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)