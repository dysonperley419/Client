import './authForm.css';

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import type { AuthFormProps } from '@/types/authFormProps';

interface LoginFormProps extends AuthFormProps {
  handleSignin: () => void;
}

const LoginForm = ({
  handleInstanceSelect,
  handleSignin,
  instances,
  instance,
  customInstance,
  setCustomInstance,
  instanceStatus,
  credentialsStatus,
  email,
  setEmail,
  password,
  setPassword,
}: LoginFormProps): JSX.Element => {
  const renderInstanceStatus = () => {
    return (
      <span className={`status-msg ${instanceStatus}`}>
        {instanceStatus === 'checking' && 'Checking...'}
        {instanceStatus === 'error' && 'Invalid instance or connection error'}
        {instanceStatus === 'valid' && 'Instance is online'}
      </span>
    );
  };

  return (
    <div className='register-form'>
      <div className='form-header'>Login to an account</div>
      <div className='form-body'>
        <span>Instance</span>
        <select
          value={typeof instance === 'object' ? instance.url : instance}
          onChange={handleInstanceSelect}
        >
          {instances.map((instance) => (
            <option key={instance.url} value={instance.url}>
              {instance.name}
            </option>
          ))}
          <option key={'custom'} value={'custom-instance'}>
            Custom Instance
          </option>
        </select>
        {instance !== 'custom-instance' && renderInstanceStatus()}
        {instance === 'custom-instance' && (
          <>
            <span>Instance URL</span>
            <input
              type='text'
              value={customInstance}
              placeholder='example.com'
              onChange={(e) => {
                setCustomInstance(e.target.value);
              }}
            />
            {renderInstanceStatus()}
          </>
        )}
        <span>Email</span>
        <input
          type='email'
          value={email}
          placeholder='Email'
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <span>Password</span>
        <input
          type='password'
          value={password}
          placeholder='Password'
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <span className={`status-msg ${credentialsStatus}`}>
          {credentialsStatus === 'checking' && 'Logging in...'}
          {credentialsStatus === 'error' && 'Invalid email or password'}
          {credentialsStatus === 'neterror' && 'A network error occurred'}
        </span>
      </div>
      <div className='form-footer'>
        <div className='actions'>
          <button className='primary-btn' onClick={handleSignin}>
            Login
          </button>
        </div>
        <Link to='/register' className='login-link'>
          Don&rsquo;t have an account?
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
