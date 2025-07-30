import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../static/css/signup.css';

export default function Signup() {
  const navigate = useNavigate(); // or use window.location.href if not using react-router
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password: confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Signup failed: ' + (data.error || 'Unknown error'));
      } else {
        alert('Signup successful! You can now log in.');
        navigate('/login'); // or window.location.href = '/login';
      }
    } catch (err) {
      alert('Signup error: ' + err.message);
    }
  };

  return (
    <>
      <a href="/" id="back-link">Back</a>
      <div className="signup-container">
        <h2>Create Account</h2>
        <form id="signup-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            name="confirm-password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit">Sign Up</button>
        </form>

        <div className="login-link">
          Already have an account? <a href="/login">Log in</a>
        </div>
      </div>
    </>
  );
}
