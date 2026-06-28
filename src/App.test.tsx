import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('Board app', () => {
  it('renders the login screen when not authenticated', () => {
    render(<App />);

    // "Work" wordmark on the login glass card.
    expect(screen.getByText('Work')).toBeInTheDocument();

    // Email field is present.
    expect(screen.getByPlaceholderText('Рабочая почта')).toBeInTheDocument();
  });
});
