import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';

function App() {
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.post('http://localhost:8000/api/token/', {
      username: 'carson',
      password: 'carson'
    }).then(res => {
      setToken(res.data.access);
      return axios.get('http://localhost:8000/api/hello/', {
        headers: { Authorization: `Bearer ${res.data.access}` }
      });
    }).then(res => setMessage(res.data.message));
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;
