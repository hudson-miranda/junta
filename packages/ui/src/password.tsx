'use client';
import { useId, useState } from 'react';
import { Eye, EyeOff, Check, Minus } from 'lucide-react';
import { passwordStrength } from '@junta/validation';

export function PasswordField({
  creation = false,
  name = 'password',
  label = 'Senha',
}: {
  creation?: boolean;
  name?: string;
  label?: string;
}) {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const id = useId();
  const result = passwordStrength(value);
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={name}
          aria-label={label}
          type={visible ? 'text' : 'password'}
          autoComplete={creation ? 'new-password' : 'current-password'}
          required
          maxLength={128}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={creation ? `${id}-feedback` : undefined}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {creation && (
        <div id={`${id}-feedback`} className="password-feedback" data-score={result.score}>
          <div className="password-summary">
            <span>Força da senha</span>
            <strong aria-live="polite">{result.label}</strong>
          </div>
          <div
            className="password-meter"
            role="meter"
            aria-label="Força da senha"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={result.score}
            aria-valuetext={result.label}
          >
            {[1, 2, 3, 4].map((n) => (
              <span key={n} data-filled={n <= result.score} />
            ))}
          </div>
          <div className={`password-minimum ${result.meetsMinimum ? 'met' : ''}`}>
            {result.meetsMinimum ? <Check size={15} /> : <Minus size={15} />}
            <span>
              Pelo menos 12 caracteres <span className="muted">({value.length}/128)</span>
            </span>
          </div>
          <small aria-live="polite">{result.hint}</small>
          <small className="muted">
            A força é uma estimativa. Evite dados pessoais e senhas reutilizadas.
          </small>
        </div>
      )}
    </div>
  );
}
