import { HashRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.js'
import MapPage from './pages/MapPage.js'
import AboutPage from './pages/AboutPage.js'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </HashRouter>
  )
}
