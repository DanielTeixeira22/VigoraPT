import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
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

const AuthPage = () => {
  const { login, register, applyAuthResponse } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar modo inicial baseado na rota
  const [isRegisterMode, setIsRegisterMode] = useState(location.pathname === '/register');

  // Login state
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // QR state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpires, setQrExpires] = useState<string | null>(null);

  // Register state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [wantsTrainer, setWantsTrainer] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState({
    certification: '',
    specialties: '',
    hourlyRate: '',
    document: null as File | null,
  });

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slideshow auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Atualizar URL quando muda de modo
  useEffect(() => {
    const targetPath = isRegisterMode ? '/register' : '/login';
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [isRegisterMode, location.pathname, navigate]);

  // QR polling
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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login({ emailOrUsername, password: loginPassword });
      navigate('/dashboard', { replace: true });
    } catch {
      toast({ title: 'Login falhou', description: 'Verifica as credenciais', status: 'error' });
    } finally {
      setLoginLoading(false);
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

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      await register({
        ...registerForm,
        wantsTrainer,
        trainerCertification: trainerInfo.certification || undefined,
        trainerSpecialties: trainerInfo.specialties || undefined,
        trainerHourlyRate: trainerInfo.hourlyRate || undefined,
        trainerDocument: trainerInfo.document,
      });
      toast({
        title: 'Conta criada',
        description: wantsTrainer
          ? 'Inicia sessão e pede validação de treinador ao administrador.'
          : 'Já podes aceder ao dashboard.',
        status: 'success',
      });
      navigate('/dashboard');
    } catch (err) {
      const message =
        err instanceof AxiosError && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Tenta novamente.';
      toast({ title: 'Erro ao registar', description: message, status: 'error' });
    } finally {
      setRegisterLoading(false);
    }
  };

  // Componente do Slideshow
  const Slideshow = ({ align = 'left' }: { align?: 'left' | 'right' }) => (
    <>
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
      <Box
        position="absolute"
        inset={0}
        bgGradient={align === 'left' ? 'linear(to-r, blackAlpha.700, blackAlpha.300)' : 'linear(to-l, blackAlpha.700, blackAlpha.300)'}
      />
      <Flex
        position="absolute"
        inset={0}
        direction="column"
        justify="center"
        align={align === 'left' ? 'flex-start' : 'flex-end'}
        p={12}
        zIndex={1}
      >
        <Heading color="white" size="2xl" mb={4} textAlign={align}>Vigora</Heading>
        <Text color="whiteAlpha.900" fontSize="xl" maxW="400px" textAlign={align}>
          {align === 'left'
            ? 'A plataforma que conecta Personal Trainers aos seus clientes.'
            : 'Junta-te à comunidade de fitness mais inovadora de Portugal.'}
        </Text>
      </Flex>
      {/* Indicadores */}
      <Flex position="absolute" bottom={8} left="50%" transform="translateX(-50%)" gap={2} zIndex={2}>
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
    </>
  );

  return (
    <Box
      position="relative"
      w="100vw"
      h="100vh"
      overflow="hidden"
      bg="background"
    >
      {/* Painel do Slideshow - Ocupa metade e desliza */}
      <Box
        position="absolute"
        top={0}
        bottom={0}
        w={{ base: '0', lg: '50%' }}
        transition="left 0.6s ease-in-out"
        left={isRegisterMode ? '50%' : '0'}
        zIndex={10}
        overflow="hidden"
      >
        <Slideshow align={isRegisterMode ? 'right' : 'left'} />
      </Box>

      {/* Formulário Login - Sempre à DIREITA, visível quando login mode */}
      <Flex
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        w={{ base: '100%', lg: '50%' }}
        align="center"
        justify="center"
        bg="background"
        p={{ base: 4, md: 8 }}
        opacity={isRegisterMode ? 0 : 1}
        visibility={isRegisterMode ? 'hidden' : 'visible'}
        transition="opacity 0.4s ease-in-out, visibility 0.4s ease-in-out"
        zIndex={5}
      >
        <Box w="100%" maxW="400px">
          <Heading size="lg" mb={2}>Entrar</Heading>
          <Text color="muted" mb={6}>
            Autenticação com username/email e password ou QR Code.
          </Text>

          <form onSubmit={handleLogin}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username ou email</FormLabel>
                <Input
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="joana.pt"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </FormControl>
              <Button type="submit" isLoading={loginLoading}>Entrar</Button>
            </Stack>
          </form>

          <Flex align="center" my={5} gap={2}>
            <Divider />
            <Text fontSize="sm" color="muted">ou</Text>
            <Divider />
          </Flex>

          <Box bg="card" border="1px dashed" borderColor="border" borderRadius="12px" p={4} mb={4}>
            <Flex align="center" justify="space-between" gap={3}>
              <Box>
                <Text fontWeight={700}>Login por QR Code</Text>
                <Text fontSize="sm" color="muted">
                  Gera um QR para ser aprovado noutra sessão.
                </Text>
              </Box>
              <Button variant="outline" size="sm" onClick={handleStartQr}>Gerar QR</Button>
            </Flex>
            {qrCode && (
              <Box mt={3} p={3} borderRadius="10px" bg="gray.50" _dark={{ bg: 'gray.800' }}>
                <Text fontSize="sm" color="muted">Código:</Text>
                <Text fontFamily="mono" fontWeight="bold">{qrCode}</Text>
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
            <Button variant="link" color="brand.500" onClick={() => setIsRegisterMode(true)}>
              Criar conta
            </Button>
          </Text>
        </Box>
      </Flex>

      {/* Formulário Register - Sempre à ESQUERDA, visível quando register mode */}
      <Flex
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        w={{ base: '100%', lg: '50%' }}
        align="center"
        justify="center"
        bg="background"
        p={{ base: 4, md: 8 }}
        overflowY="auto"
        opacity={isRegisterMode ? 1 : 0}
        visibility={isRegisterMode ? 'visible' : 'hidden'}
        transition="opacity 0.4s ease-in-out, visibility 0.4s ease-in-out"
        zIndex={5}
      >
        <Box w="100%" maxW="420px">
          <Heading size="lg" mb={2}>Criar conta</Heading>
          <Text color="muted" mb={6} fontSize="sm">
            O registo cria um perfil de Cliente. Para ser Personal Trainer, pede validação ao admin após login.
          </Text>

          <form onSubmit={handleRegister}>
            <Stack spacing={3}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
              </FormControl>
              <Flex gap={3}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Primeiro nome</FormLabel>
                  <Input
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  />
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel>Apelido</FormLabel>
                  <Input
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  />
                </FormControl>
              </Flex>

              <Checkbox isChecked={wantsTrainer} onChange={(e) => setWantsTrainer(e.target.checked)}>
                Quero ser personal trainer
              </Checkbox>

              {wantsTrainer && (
                <Stack spacing={2} p={3} border="1px solid" borderColor="border" borderRadius="12px" bg="gray.50" _dark={{ bg: 'gray.800' }}>
                  <Text fontWeight={700} fontSize="sm">Dados profissionais</Text>
                  <FormControl>
                    <FormLabel fontSize="sm">Certificação</FormLabel>
                    <Input
                      size="sm"
                      value={trainerInfo.certification}
                      onChange={(e) => setTrainerInfo({ ...trainerInfo, certification: e.target.value })}
                      placeholder="Ex.: Cédula TÉF"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Especialidades</FormLabel>
                    <Input
                      size="sm"
                      value={trainerInfo.specialties}
                      onChange={(e) => setTrainerInfo({ ...trainerInfo, specialties: e.target.value })}
                      placeholder="Ex.: hipertrofia, reabilitação"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Preço hora (€)</FormLabel>
                    <Input
                      size="sm"
                      type="number"
                      value={trainerInfo.hourlyRate}
                      onChange={(e) => setTrainerInfo({ ...trainerInfo, hourlyRate: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Documento (certificado)</FormLabel>
                    <Input
                      size="sm"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setTrainerInfo({ ...trainerInfo, document: e.target.files?.[0] ?? null })}
                    />
                  </FormControl>
                </Stack>
              )}

              <Button type="submit" isLoading={registerLoading}>Registar</Button>
            </Stack>
          </form>

          <Box mt={4}>
            <Text fontSize="sm">
              Já tens conta?{' '}
              <Button variant="link" color="brand.500" onClick={() => setIsRegisterMode(false)}>
                Entrar
              </Button>
            </Text>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default AuthPage;
