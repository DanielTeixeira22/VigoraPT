import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import StatCard from './StatCard';
import { theme } from '../../theme';

describe('StatCard', () => {
  it('mostra label e valor', () => {
    render(
      <ChakraProvider theme={theme}>
        <StatCard label="Total" value={5} helper="semana" />
      </ChakraProvider>
    );

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('semana')).toBeInTheDocument();
  });
});
