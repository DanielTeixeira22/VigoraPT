import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Stack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Flex,
} from '@chakra-ui/react';
import { FiArrowLeft, FiMail } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { forgotPassword } from '../../services/auth';

// Imagens do slideshow (mesmas do register)
const SLIDE_IMAGES = [
  '/images/login/slide1.jpg',
  '/images/login/slide2.jpg',
  '/images/login/slide3.jpg',
  '/images/login/slide4.jpg',
];

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();

  // Slideshow auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro. Tenta novamente.',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Componente do Slideshow
  const Slideshow = () => (
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
        bgGradient="linear(to-r, blackAlpha.700, blackAlpha.300)"
      />
      <Flex
        position="absolute"
        inset={0}
        direction="column"
        justify="center"
        align="flex-start"
        p={12}
        zIndex={1}
      >
        <Heading color="white" size="2xl" mb={4}>Vigora</Heading>
        <Text color="whiteAlpha.900" fontSize="xl" maxW="400px">
          A plataforma que conecta Personal Trainers aos seus clientes.
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
      {/* Slideshow à esquerda */}
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        w={{ base: '0', lg: '50%' }}
        zIndex={10}
        overflow="hidden"
      >
        <Slideshow />
      </Box>

      {/* Formulário à direita */}
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
        zIndex={5}
      >
        <Box w="100%" maxW="400px">
          <Button
            variant="ghost"
            leftIcon={<Icon as={FiArrowLeft} />}
            mb={6}
            color="muted"
            fontWeight="normal"
            size="sm"
            _hover={{ color: 'brand.500', bg: 'transparent' }}
            onClick={() => navigate('/login')}
          >
            Voltar ao login
          </Button>

          {submitted ? (
            <Box textAlign="center">
              <Icon as={FiMail} boxSize={16} color="brand.500" mb={4} />
              <Heading size="lg" mb={4}>Verifica o teu email</Heading>
              <Text color="muted" mb={6}>
                Se o email existir na nossa base de dados, receberás instruções para redefinir a password.
              </Text>
              <Alert status="info" borderRadius="md" mb={6}>
                <AlertIcon />
                Verifica também a pasta de spam.
              </Alert>
              <Button onClick={() => navigate('/login')} w="100%">
                Voltar ao login
              </Button>
            </Box>
          ) : (
            <>
              <Heading size="lg" mb={2}>Esqueceste a password?</Heading>
              <Text color="muted" mb={6}>
                Insere o teu email e enviaremos instruções para redefinir a password.
              </Text>

              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                    />
                  </FormControl>
                  <Button type="submit" isLoading={loading}>
                    Enviar instruções
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default ForgotPasswordPage;
