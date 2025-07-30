// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // If using React Router
import "../static/css/login.css";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // remove if not using react-router

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Login successful!');
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', 'ccarson');
        navigate('/'); // or use window.location.href = '/'
      } else {
        alert(data.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login.');
    }
  };

  return (
    <>
      <a href="/" id="back-link">Back</a>
      <div className="login-container">
        <h2>Login</h2>
        <form id="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Log In</button>
        </form>
        <div
          className="forgot-password"
          onClick={() => alert('Reset password flow coming soon!')}
        >
          Forgot password?
        </div>
        <div className="login-link" style={{ color: 'white', marginTop: '2%' }}>
          Sign up now <a href="/signup" style={{ color: 'white' }}>Signup</a>
        </div>
      </div>
    </>
  );
}
