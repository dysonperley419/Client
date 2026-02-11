import { type JSX, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as z from 'zod';

import { useAuthLogic } from '@/hooks/useAuthLogic';
import { ErrorMsgSchema } from '@/types/authFormProps';
import type { ErrorStatusFields } from '@/types/errorStatusFields';
import type { Instance } from '@/types/instance';
import type { RegisterRequest } from '@/types/requests';
import { ErrorResponseSchema, RegisterResponseSchema } from '@/types/responses';

import RegisterForm from '../components/auth/registerForm';
import Brand from '../components/common/brand';
import Footer from '../components/common/footer';

function Register(): JSX.Element {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customInstance, setCustomInstance] = useState('');
  const [instance, setInstance] = useState<Instance | string | undefined>(undefined);
  const [credentialsStatus, setCredentialsStatus] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [miscError, setMiscError] = useState<string | null>(null);

  const { instances, status: instanceStatus, checkInstance } = useAuthLogic(
    instance,
    customInstance,
  );

  const handleInstanceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUrl = e.target.value;
    const fullInstance = instances.find((i) => i.url === selectedUrl);
    setInstance(fullInstance ?? selectedUrl);
    void checkInstance(selectedUrl);
  };

  if (localStorage.getItem('Authorization')) return <Navigate to='/' />;

  const handleSignup = async () => {
    console.log("AAAA");
    setUsernameStatus(null);
    setPasswordStatus(null);
    setEmailStatus(null);

    try {
      const registerRequest: RegisterRequest = {
        username,
        password,
        email,
        date_of_birth: '1999-01-01',
        consent: true,
      };

      const response = await fetch(
        `${localStorage.getItem('selectedInstanceUrl') ?? ''}/${localStorage.getItem('defaultApiVersion') ?? ''}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerRequest),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const parsed = JSON.parse(data);
        setUsernameStatus(parsed.username && 'error');
        setPasswordStatus(parsed.password && 'error');
        setEmailStatus(parsed.email && 'error');
        return;
      }

      const parsed = RegisterResponseSchema.parse(data);

      localStorage.setItem('Authorization', parsed.token);
      localStorage.setItem('email', email);
      window.location.href = '/';
    } catch (err) {
      setMiscError('An error occurred while registering');
      console.error(err);
    }
  };

  return (
    <div className='page-wrapper'>
      <Brand />
      <div className='center'>
        <RegisterForm
          handleInstanceSelect={handleInstanceSelect}
          handleSignup={() => void handleSignup()}
          instances={instances}
          setUsername={setUsername}
          username={username}
          email={email}
          instance={instance}
          instanceStatus={instanceStatus}
          usernameStatus={usernameStatus}
          passwordStatus={passwordStatus}
          emailStatus={emailStatus}
          miscError={miscError}
          setEmail={setEmail}
          password={password}
          customInstance={customInstance}
          setCustomInstance={setCustomInstance}
          setPassword={setPassword}
        />
      </div>
      <Footer />
    </div>
  );
}

export default Register;
