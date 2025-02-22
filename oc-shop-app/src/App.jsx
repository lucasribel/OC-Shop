import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Shop from "./pages/Shop";
import Config from "./pages/Config";
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/shop" element={<Shop />} />
        <Route path="/config" element={<Config />} />
      </Routes>
    </Router>
  );
}

export default App;
