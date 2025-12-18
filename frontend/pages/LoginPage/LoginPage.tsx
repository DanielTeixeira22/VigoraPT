import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { qrPoll, qrStart } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types/domain';

// Imagens do slideshow
const SLIDE_IMAGES = [
  '/images/login/slide1.jpg',
  '/images/login/slide2.jpg',
  '/images/login/slide3.jpg',
  '/images/login/slide4.jpg',
];

const LoginPage = () => {
  const { login, applyAuthResponse } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [emailOrUsername, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpires, setQrExpires] = useState<string | null>(null);

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slideshow auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000); // Troca a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  type QrPollResult = {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    user?: User;
    accessToken?: string;
    refreshToken?: string;
  };

  useEffect(() => {
    let interval: number | undefined;
    if (qrCode) {
      interval = window.setInterval(async () => {
        try {
          const res: QrPollResult = await qrPoll(qrCode);
          if (res && res.status === 'APPROVED' && res.user && res.accessToken && res.refreshToken) {
            toast({ title: 'Login via QR aprovado!', status: 'success' });
            applyAuthResponse({
              user: res.user,
              accessToken: res.accessToken,
              refreshToken: res.refreshToken,
            });
            navigate('/dashboard', { replace: true });
          }
        } catch (err) {
          console.warn('Poll QR falhou', err);
        }
      }, 3000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [applyAuthResponse, navigate, qrCode, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ emailOrUsername, password });
      navigate('/dashboard', { replace: true });
    } catch {
      toast({ title: 'Login falhou', description: 'Verifica as credenciais', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartQr = async () => {
    try {
      const res = await qrStart();
      setQrCode(res.code);
      setQrExpires(res.expiresAt);
      toast({
        title: 'QR code gerado',
        description: 'Abre a app móvel (ou outra sessão) para aprovar.',
        status: 'info',
      });
    } catch {
      toast({ title: 'Não foi possível gerar QR', status: 'error' });
    }
  };

  return (
    <Flex minH="100vh">
      {/* Lado esquerdo - Slideshow */}
      <Box
        flex={1}
        position="relative"
        display={{ base: 'none', lg: 'block' }}
        overflow="hidden"
      >
        {/* Imagens do slideshow */}
        {SLIDE_IMAGES.map((src, index) => (
          <Box
            key={src}
            position="absolute"
            inset={0}
            bgImage={`url('${src}')`}
            bgSize="cover"
            bgPos="center"
            opacity={index === currentSlide ? 1 : 0}
            transition="opacity 1s ease-in-out"
          />
        ))}
        
        {/* Overlay gradient */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="linear(to-r, blackAlpha.700, blackAlpha.300)"
        />

        {/* Texto sobre a imagem */}
        <Flex
          position="absolute"
          inset={0}
          direction="column"
          justify="center"
          align="flex-start"
          p={12}
          zIndex={1}
        >
          <Heading color="white" size="2xl" mb={4}>
            Vigora
          </Heading>
          <Text color="whiteAlpha.900" fontSize="xl" maxW="400px">
            A plataforma que conecta Personal Trainers aos seus clientes.
          </Text>
        </Flex>

        {/* Indicadores de slide */}
        <Flex
          position="absolute"
          bottom={8}
          left="50%"
          transform="translateX(-50%)"
          gap={2}
          zIndex={2}
        >
          {SLIDE_IMAGES.map((_, index) => (
            <Box
              key={index}
              w={index === currentSlide ? '24px' : '8px'}
              h="8px"
              bg={index === currentSlide ? 'white' : 'whiteAlpha.500'}
              borderRadius="full"
              transition="all 0.3s ease"
              cursor="pointer"
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </Flex>
      </Box>

      {/* Lado direito - Formulário */}
      <Flex 
        flex={{ base: 1, lg: '0 0 520px' }}
        align="center" 
        justify="center" 
        bg="background"
        p={{ base: 4, md: 8 }}
      >
        <Card w="100%" maxW="450px" boxShadow="2xl">
          <CardBody>
            <Heading size="lg" mb={2}>
              Entrar
            </Heading>
            <Text color="muted" mb={6}>
              Plataforma de Personal Trainers — autenticação com username/email e password ou QR Code.
            </Text>

            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Username ou email</FormLabel>
                  <Input value={emailOrUsername} onChange={(e) => setEmail(e.target.value)} placeholder="joana.pt" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </FormControl>

                <Button type="submit" isLoading={loading}>
                  Entrar
                </Button>
              </Stack>
            </form>

            <Flex align="center" my={5} gap={2}>
              <Divider />
              <Text fontSize="sm" color="muted">
                ou
              </Text>
              <Divider />
            </Flex>

            <Box bg="card" border="1px dashed" borderColor="border" borderRadius="12px" p={4} mb={4}>
              <Flex align="center" justify="space-between" gap={3}>
                <div>
                  <Text fontWeight={700}>Login por QR Code</Text>
                  <Text fontSize="sm" color="muted">
                    Gera um QR para ser aprovado noutra sessão (mock web ou app móvel).
                  </Text>
                </div>
                <Button variant="outline" onClick={handleStartQr}>
                  Gerar QR
                </Button>
              </Flex>
              {qrCode && (
                <Box mt={3} p={3} borderRadius="10px" bg="gray.50" _dark={{ bg: 'gray.800' }}>
                  <Text fontSize="sm" color="muted">
                    Código:
                  </Text>
                  <Text fontFamily="mono" fontWeight="bold">
                    {qrCode}
                  </Text>
                  {qrExpires && (
                    <Text fontSize="xs" color="muted">
                      Expira: {new Date(qrExpires).toLocaleTimeString()}
                    </Text>
                  )}
                </Box>
              )}
            </Box>

            <Text fontSize="sm">
              Novo na plataforma?{' '}
              <Link as={RouterLink} to="/register" color="brand.500">
                Criar conta
              </Link>
            </Text>
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  );
};

export default LoginPage;
