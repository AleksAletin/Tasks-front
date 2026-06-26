import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('Board app', () => {
  it('renders the login screen when not authenticated', () => {
    renderApp();

    // "Work" wordmark on the login glass card.
    expect(screen.getByText('Work')).toBeInTheDocument();

    // Email field + primary action are present.
    expect(screen.getByPlaceholderText('Рабочая почта')).toBeInTheDocument();
  });
});
