import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link as ChakraLink,
  Stack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { resetPassword } from '../../services/auth';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Token inválido',
        description: 'O link de reset não é válido.',
        status: 'error',
      });
      navigate('/login');
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As passwords não coincidem.',
        status: 'error',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A password deve ter pelo menos 6 caracteres.',
        status: 'error',
      });
      return;
    }

    setLoading(true);
    
    try {
      await resetPassword(token!, password);
      setSuccess(true);
      toast({
        title: 'Password atualizada!',
        description: 'Já podes fazer login com a nova password.',
        status: 'success',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Token inválido ou expirado. Solicita um novo link.',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="background"
      p={4}
    >
      <Box w="100%" maxW="400px">
        <ChakraLink
          as={Link}
          to="/login"
          display="inline-flex"
          alignItems="center"
          gap={2}
          mb={6}
          color="muted"
          fontSize="sm"
          _hover={{ color: 'brand.500', textDecoration: 'none' }}
        >
          <Icon as={FiArrowLeft} />
          Voltar ao login
        </ChakraLink>

        {success ? (
          <Box textAlign="center">
            <Icon as={FiCheckCircle} boxSize={16} color="green.500" mb={4} />
            <Heading size="lg" mb={4}>Password atualizada!</Heading>
            <Text color="muted" mb={6}>
              A tua password foi alterada com sucesso. Já podes fazer login.
            </Text>
            <Button as={Link} to="/login" w="100%">
              Ir para o login
            </Button>
          </Box>
        ) : (
          <>
            <Heading size="lg" mb={2}>Nova password</Heading>
            <Text color="muted" mb={6}>
              Escolhe uma nova password para a tua conta.
            </Text>

            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nova password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                        icon={<Icon as={showPassword ? FiEyeOff : FiEye} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Confirmar password</FormLabel>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repete a password"
                  />
                </FormControl>

                {password && confirmPassword && password !== confirmPassword && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    As passwords não coincidem
                  </Alert>
                )}

                <Button type="submit" isLoading={loading}>
                  Atualizar password
                </Button>
              </Stack>
            </form>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ResetPasswordPage;
