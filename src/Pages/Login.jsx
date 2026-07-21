import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import logo from '../assets/Logo.png';
import './Login.css';

const Login = ({ setToken }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    Username: '',
    Password: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [loginError, setLoginError] = useState('');

  function handleChange(event) {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));

    // clear error when typing
    setLoginError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);

    if (!formData.Username || !formData.Password) {
      return;
    }

    setLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('USER')
        .select('email')
        .eq('username', formData.Username)
        .single();

      if (profileError || !profile) {
        throw new Error('Username not found');
      }

      const email = profile.email;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.Password,
      });

      if (error) throw error;

      setLoginError(''); // clear error on success

      setToken(data);
      navigate('/dashboard');

      setFormData({
        Username: '',
        Password: ''
      });

      setSubmitted(false);

    } catch (error) {
      setLoginError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>

        <div className="logo-section">
          <img src={logo} alt="Logo" />
          <h2>New Trader's Lucky Mart</h2>
        </div>

        <input
          placeholder="Username"
          name="Username"
          type="text"
          value={formData.Username}
          onChange={handleChange}
          className={submitted && !formData.Username ? "logininput-error" : ""}
        />

        {submitted && !formData.Username && (
          <span className="loginerror-text">Username is required.</span>
        )}

        <input
          placeholder="Password"
          name="Password"
          type="password"
          value={formData.Password}
          onChange={handleChange}
          className={submitted && !formData.Password ? "logininput-error" : ""}
        />

        {submitted && !formData.Password && (
          <span className="loginerror-text">Password is required.</span>
        )}

        
        {loginError && (
          <span className="loginerror-text">
            {loginError}
          </span>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>

      </form>
    </div>
  );
};

export default Login;