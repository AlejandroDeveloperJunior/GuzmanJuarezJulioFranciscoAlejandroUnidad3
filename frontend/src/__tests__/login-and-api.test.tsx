import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth-context';
import { LoginPage } from '../pages/LoginPage';

describe('Pruebas Unitarias Frontend (Vitest + React Testing Library)', () => {
  test('LoginPage renderiza selector de cuentas demo RBAC y cambia entre Login y Registro', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ csrfToken: 'test-csrf-token' }),
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('MediConnect Pro')).toBeInTheDocument();
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Médico')).toBeInTheDocument();
    expect(screen.getByText('Admin TI')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Registrarse'));
    expect(screen.getByText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByText('Crear cuenta cifrada')).toBeInTheDocument();
  });
});
