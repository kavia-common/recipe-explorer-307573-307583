import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders Recipe Explorer header', () => {
  render(<App />);
  const heading = screen.getByText(/Recipe Explorer/i);
  expect(heading).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const toggle = screen.getByRole('button', { name: /switch to (dark|light) theme/i });
  expect(toggle).toBeInTheDocument();
});

test('toggles dark theme class on body', () => {
  render(<App />);

  const toggle = screen.getByRole('button', { name: /switch to dark theme/i });
  expect(document.body.classList.contains('theme-dark')).toBe(false);

  fireEvent.click(toggle);
  expect(document.body.classList.contains('theme-dark')).toBe(true);
});
