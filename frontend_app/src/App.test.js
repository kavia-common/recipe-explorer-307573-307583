import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Recipe Explorer header', () => {
  render(<App />);
  const heading = screen.getByText(/Recipe Explorer/i);
  expect(heading).toBeInTheDocument();
});
