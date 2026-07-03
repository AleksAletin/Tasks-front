import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { useBoard } from './store';

// Бейдж «новых» обращений + гейт: пункт «Обращения» виден только участникам.
describe('Sidebar — бейдж обращений и доступ', () => {
  beforeEach(() => {
    useBoard.setState({ viewer: false, ticketsNewCount: 0, navOpen: true, settingsScreen: false });
  });

  it('участник видит пункт «Обращения» с бейджем новых', () => {
    useBoard.setState({ ticketsNewCount: 3 });
    render(<Sidebar />);

    expect(screen.getByText('Обращения')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('без новых — пункт есть, бейджа нет', () => {
    render(<Sidebar />);

    expect(screen.getByText('Обращения')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('Наблюдателю пункт не показывается вовсе', () => {
    useBoard.setState({ viewer: true, ticketsNewCount: 5 });
    render(<Sidebar />);

    expect(screen.queryByText('Обращения')).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});
