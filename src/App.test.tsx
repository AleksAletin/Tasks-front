import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

function renderApp() {
  // Isolated client with retries off so the (failing) /roles call settles fast.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App shell', () => {
  it('renders the navigation and the registry landing page', () => {
    renderApp();

    // Brand in the left nav.
    expect(screen.getByText('XRM migration tool')).toBeInTheDocument();

    // Nav links for the main screens.
    expect(
      screen.getByRole('link', { name: 'Паритет-матрица' }),
    ).toBeInTheDocument();

    // The index route renders the registry heading.
    expect(
      screen.getByRole('heading', { name: 'Реестр по ролям' }),
    ).toBeInTheDocument();
  });
});
