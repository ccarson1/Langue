// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // If using React Router
import "../static/css/login.css";

export default function Login() {
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // remove if not using react-router


  const logout = () => {
    localStorage.clear();
    navigate('/login'); // or window.location.href = "/login"
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // const response = await fetch('http://localhost:8000/api/login', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ email, password })
      // });

      // const data = await response.json();

      // if (response.ok) {
      //   alert('Login successful!');
      //   localStorage.setItem('user', JSON.stringify(data.user));
      //   localStorage.setItem('isLoggedIn', 'true');
      //   localStorage.setItem('username', 'ccarson');
      //   navigate('/'); // or use window.location.href = '/'
      // } else {
      //   alert(data.error || 'Login failed.');
      // }

      const response = await fetch("http://localhost:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,  // or username if using default User model
          password: password
        }),
      });

      const data = await response.json();
      // console.log("Access Token:", data.access);
      // console.log("Refresh Token:", data.refresh);
      if (response.ok) {
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("username", username);
        localStorage.setItem("isLoggedIn", 'true');
        navigate('/'); // Go to home or dashboard
      } else {
        alert('Invalid username or password.');
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
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUser(e.target.value)}
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
