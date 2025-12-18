import React from 'react';
import {
  Box,
  Container,
  Stack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  VStack,
  HStack,
  Image,
  Avatar,
  Tag,
  Divider,
  useColorModeValue,
  Spinner,
  Icon,
  Badge,
  Input,
  Grid,
} from '@chakra-ui/react';
import { FiClock, FiTarget, FiUsers, FiFacebook, FiInstagram, FiTwitter, FiLinkedin, FiMail, FiPhone, FiMapPin, FiZap } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { listPublicTrainers } from '../../services/trainers';
import type { TrainerProfile } from '../../types/domain';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

const Homepage: React.FC = () => {
  const bg = useColorModeValue('background', 'gray.900');
  const cardBg = useColorModeValue('card', 'gray.800');
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const { isAuthenticated } = useAuth();

  // Carousel state
  const slides = [
    {
      title: 'Treinos Personalizados',
      subtitle: 'Planos e acompanhamento adaptados a si',
      image: 'https://img.freepik.com/fotos-gratis/homem-forte-a-treinar-no-ginasio_1303-23478.jpg?semt=ais_hybrid&w=740&q=80',
    },
    {
      title: 'Aulas e Horários',
      subtitle: 'Encontre a aula certa ao seu horário',
      image: 'https://media.istockphoto.com/id/2027278927/pt/foto/young-athletic-woman-exercising-with-barbell-during-sports-training-in-a-gym.jpg?s=612x612&w=0&k=20&c=xSOo7lZDRD2PFaekcdI-u2V0m2Sne66Z8ChzrOyZS_A=',
    },
    {
      title: 'Profissionais Qualificados',
      subtitle: 'Treinadores certificados prontos a ajudar',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.0.3&s=9b2b7b6c4e1d8c0f6a7b6c8d2e3f1a4b',
    },
  ];
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingTrainers(true);
    listPublicTrainers({ limit: 8 })
      .then((res) => {
        if (!mounted) return;
        // `listPublicTrainers` returns { items, page, total, pages }
        const items = (res && (res as any).items) || (res as any) || [];
        setTrainers(items || []);
      })
      .catch(() => {
        if (!mounted) return;
        setTrainers([]);
      })
      .finally(() => mounted && setLoadingTrainers(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box bg={bg} minH="100vh">
      <Navbar />

      {/* Hero / Carousel */}
      <Box position="relative" color="white">
        <Box height={{ base: 64, md: 96 }} position="relative" overflow="hidden">
          {slides.map((s, i) => (
            <Box
              key={s.title}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bgImage={`linear-gradient(rgba(8,8,10,0.6), rgba(8,8,10,0.6)), url(${s.image})`}
              bgRepeat="no-repeat"
              bgPos="center"
              bgSize="cover"
              transition="opacity 0.8s"
              opacity={i === activeSlide ? 1 : 0}
              display="flex"
              alignItems="center"
            >
              <Container maxW="7xl">
                <Stack direction={{ base: 'column', md: 'row' }} spacing={10} align="center">
                  <VStack align="start" spacing={4} flex={1} color="white">
                    <Tag bg="accent.500" color="white" borderRadius="full" px={3} py={1} fontWeight={700}>
                      VIGORA
                    </Tag>
                    <Heading as="h1" size="2xl" lineHeight="short" fontWeight={800}>
                      {s.title}
                    </Heading>
                    <Text fontSize="lg" maxW="2xl" opacity={0.95}>
                      {s.subtitle}
                    </Text>
                    <HStack spacing={4} pt={4}>
                      {!isAuthenticated ? (
                        <>
                          <Button as={RouterLink} to="/register" colorScheme="accent" bg="accent.500" color="white" _hover={{ bg: 'accent.600' }}>
                            Registar
                          </Button>
                          <Button as={RouterLink} to="/login" variant="outline" borderColor="whiteAlpha.600" color="white">
                            Entrar
                          </Button>
                        </>
                      ) : (
                        <Button as={RouterLink} to="/dashboard" colorScheme="brand" bg="brand.500" color="white">
                          Ir para o Dashboard
                        </Button>
                      )}
                    </HStack>
                  </VStack>

                  {/* removed duplicate image on the right to avoid repeating the same image
                      Background uses the slide image already (cover, no-repeat) */}
                  <Box flex={1} display={{ base: 'none', md: 'block' }} />
                </Stack>
              </Container>
            </Box>
          ))}

          {/* slide indicators */}
          <HStack position="absolute" bottom={4} left="50%" transform="translateX(-50%)" spacing={3}>
            {slides.map((_, i) => (
              <Box key={i} width={3} height={3} borderRadius="full" bg={i === activeSlide ? 'accent.500' : 'whiteAlpha.600'} cursor="pointer" onClick={() => setActiveSlide(i)} />
            ))}
          </HStack>
        </Box>
      </Box>

      {/* About Us (two-column) */}
      <Box py={{ base: 12, md: 20 }}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} alignItems="center">
            <Box>
              <Image src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCOniOxswIedgsOTnwa-6HcDgASDMieIIpPQ&s" alt="about-gym" borderRadius="md" boxShadow="md" />
            </Box>
            <Box>
              <Heading size="lg">About Vigora</Heading>
              <Text mt={4} color="textSecondary.default">
                Vigora é uma comunidade de treino dedicada ao progresso sustentável, combinando metodologias baseadas em ciência,
                treinadores certificados e planos adaptados às necessidades individuais.
              </Text>
              <Text mt={4} color="textSecondary.default">
                A nossa missão é ajudar-te a construir hábitos duradouros e a atingir objetivos com confiança.
              </Text>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Exercise Genres (cards) */}
      <Box py={{ base: 10, md: 16 }} bg={useColorModeValue('gray.50', 'gray.900')}>
        <Container maxW="7xl">
          <VStack spacing={4} mb={12} textAlign="center">
            <Badge colorScheme="brand" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
              TYPES DE TREINO
            </Badge>
            <Heading size="lg">Exercise Genres</Heading>
            <Text color="textSecondary.default" maxW="2xl">Diferentes abordagens para diferentes objetivos</Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 3, lg: 4 }} spacing={6}>
            {[
              { title: 'Strength', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=9b2b7b6c', icon: FiZap },
              { title: 'Cardio', img: 'https://media.istockphoto.com/id/1132086660/photo/side-view-of-beautiful-muscular-woman-running-on-treadmill.jpg?s=612x612&w=0&k=20&c=5Vq_BJjG7sbIyKIP-Adu0pChReDXm0dC7BVPvto2M0I=', icon: FiTarget },
              { title: 'Mobility', img: 'https://cdn.mos.cms.futurecdn.net/56N87sXLhzp5T4AMu3KB8P-1280-80.png', icon: FiClock },
              { title: 'HIIT', img: 'https://www.muscletech.com/cdn/shop/articles/HIIT_Workouts_2.jpg?v=1702665389', icon: FiZap },
            ].map((g) => (
              <Box
                key={g.title}
                bg={cardBg}
                borderRadius="md"
                overflow="hidden"
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-8px)', boxShadow: 'lg' }}
                cursor="pointer"
              >
                <Box position="relative" overflow="hidden" height={40}>
                  <Image src={g.img} alt={g.title} objectFit="cover" height="100%" width="100%" transition="transform 0.3s" _groupHover={{ transform: 'scale(1.05)' }} />
                  <Box position="absolute" top={2} right={2}>
                    <Icon as={g.icon} boxSize={6} color="white" />
                  </Box>
                </Box>
                <Box p={4}>
                  <Heading size="sm">{g.title}</Heading>
                  <Text mt={2} color="textSecondary.default" fontSize="sm">Aulas e treinos focados em {g.title.toLowerCase()}.</Text>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Gym Info */}
      <Box py={{ base: 12, md: 20 }}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} alignItems="center">
            <Box order={{ base: 2, md: 1 }}>
              <Heading size="lg">Our Gym</Heading>
              <Text mt={4} color="textSecondary.default">
                Espaços equipados com máquinas modernas, áreas de peso livre, e salas dedicadas a aulas de grupo.
                Ambiente motivador e seguro para todos os níveis.
              </Text>
              <Button mt={6} colorScheme="brand">Saiba mais</Button>
            </Box>
            <Box order={{ base: 1, md: 2 }}>
              <Image src="https://i.ebayimg.com/images/g/BjgAAOSwA-Nbrehv/s-l400.jpg" alt="gym" borderRadius="md" boxShadow="md" />
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Sample Schedule */}
      <Box py={{ base: 8, md: 12 }} bg={useColorModeValue('gray.50', 'gray.900')}>
        <Container maxW="7xl">
          <Heading size="lg" textAlign="center">Training Classes Schedule</Heading>
          <Text textAlign="center" mt={2} color="textSecondary.default">Exemplo de horários semanais</Text>
          <Box mt={8} overflowX="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Monday</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Tuesday</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Wednesday</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Thursday</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Friday</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '06:00 - 07:00', monday: 'Fitness', tuesday: 'Crossfit', wednesday: 'Yoga', thursday: 'Strength', friday: 'Cardio' },
                  { time: '09:00 - 10:00', monday: 'Pilates', tuesday: 'Boxe', wednesday: 'Spin', thursday: 'HIIT', friday: 'Stretch' },
                  { time: '18:00 - 19:00', monday: 'Strength', tuesday: 'Cardio', wednesday: 'Crossfit', thursday: 'Yoga', friday: 'Circuit' },
                ].map((r) => (
                  <tr key={r.time} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '10px' }}>{r.time}</td>
                    <td style={{ padding: '10px' }}>{r.monday}</td>
                    <td style={{ padding: '10px' }}>{r.tuesday}</td>
                    <td style={{ padding: '10px' }}>{r.wednesday}</td>
                    <td style={{ padding: '10px' }}>{r.thursday}</td>
                    <td style={{ padding: '10px' }}>{r.friday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Container>
      </Box>

      {/* Plans */}
      <Container maxW="7xl" py={{ base: 10, md: 16 }}>
        <VStack spacing={4} mb={12} textAlign="center">
          <Badge colorScheme="brand" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
            PRICING
          </Badge>
          <Heading size="lg">Find Your Perfect Plan</Heading>
          <Text color="textSecondary.default" maxW="2xl">Planos flexíveis adaptados às suas necessidades</Text>
        </VStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          {[
            { name: 'Essential Plan', price: '$150', desc: 'Acompanhamento básico', popular: false },
            { name: 'Popular', price: '$180', desc: 'Plano completo com coaching', popular: true },
            { name: 'Pro Plan', price: '$250', desc: 'Plano avançado com avaliações', popular: false },
          ].map((plan) => (
            <Box
              key={plan.name}
              bg={cardBg}
              p={6}
              borderRadius="md"
              textAlign="center"
              borderWidth={plan.popular ? '2px' : '1px'}
              borderColor={plan.popular ? 'accent.500' : 'transparent'}
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', boxShadow: 'xl' }}
              position="relative"
            >
              {plan.popular && (
                <Badge position="absolute" top={-3} left="50%" transform="translateX(-50%)" colorScheme="accent" bg="accent.500">
                  POPULAR
                </Badge>
              )}
              <Heading size="md" mb={2}>{plan.name}</Heading>
              <Text mt={2} fontSize="3xl" fontWeight={800} color={plan.popular ? 'accent.500' : 'brand.500'}>
                {plan.price}
              </Text>
              <Text color="textSecondary.default" mt={2} mb={4}>/mês</Text>
              <VStack mt={6} spacing={3}>
                <Text color="textSecondary.default">{plan.desc}</Text>
                <Button
                  w="100%"
                  colorScheme={plan.popular ? 'accent' : 'brand'}
                  bg={plan.popular ? 'accent.500' : 'transparent'}
                  color={plan.popular ? 'white' : 'inherit'}
                  borderWidth={plan.popular ? 0 : 2}
                  borderColor={plan.popular ? 'transparent' : 'brand.500'}
                  _hover={{ transform: 'scale(1.05)' }}
                  transition="all 0.2s"
                >
                  Escolher Plano
                </Button>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </Container>

      {/* Team - show only if trainers exist */}
      {loadingTrainers ? (
        <Container maxW="7xl" py={{ base: 10, md: 16 }}>
          <HStack justify="center">
            <Spinner />
          </HStack>
        </Container>
      ) : trainers && trainers.length > 0 ? (
        <Box py={{ base: 10, md: 16 }} bg={useColorModeValue('gray.50', 'gray.900')}>
          <Container maxW="7xl">
            <Heading size="lg" textAlign="center">Meet Our Proficient Trainers</Heading>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mt={8} alignItems="center">
                {trainers.map((t) => {
                const trainerId = t._id ?? (typeof t.userId === 'string' ? t.userId : (t.userId as any)?._id) ?? undefined;
                const trainerName = typeof t.userId === 'string' ? t.userId : (t.userId as any)?.username || 'Trainer';
                return (
                  <VStack key={trainerId || trainerName} bg={cardBg} p={4} borderRadius="md">
                    <Avatar name={trainerName} src={t.avatarUrl} size="lg" />
                    <Text fontWeight={700}>{trainerName}</Text>
                    <Text fontSize="sm" color="textSecondary.default">{(t.specialties && t.specialties.join(', ')) || 'Trainer'}</Text>
                  </VStack>
                );
              })}
            </SimpleGrid>
          </Container>
        </Box>
      ) : null}

      {/* Testimonials / Articles */}
      <Box py={{ base: 12, md: 20 }}>
        <Container maxW="7xl">
          <VStack spacing={4} mb={12} textAlign="center">
            <Badge colorScheme="accent" variant="subtle" px={3} py={1} borderRadius="full" fontSize="sm">
              CLIENTE REVIEWS
            </Badge>
            <Heading size="lg">What Our Clients Say</Heading>
            <Text color="textSecondary.default" maxW="2xl">Real feedback from our community members</Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              {
                name: 'João Silva',
                role: 'Personal Training Client',
                comment: 'Excelente acompanhamento e resultados visíveis em poucos meses. Recomendo muito!',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
              },
              {
                name: 'Maria Costa',
                role: 'Group Classes Member',
                comment: 'As aulas são motivadoras e os treinadores muito atentos. Melhor decisão que fiz para minha saúde!',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
              },
              {
                name: 'Carlos Santos',
                role: 'Strength Training Enthusiast',
                comment: 'Equipamento de qualidade e ambiente acolhedor. Já sou membro há 1 ano!',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
              },
            ].map((testimonial) => (
              <Box
                key={testimonial.name}
                bg={cardBg}
                p={6}
                borderRadius="lg"
                transition="all 0.3s"
                _hover={{ boxShadow: 'lg', transform: 'translateY(-4px)' }}
              >
                <HStack mb={4} spacing={4}>
                  <Avatar name={testimonial.name} src={testimonial.image} size="md" />
                  <Box flex={1}>
                    <Heading size="sm">{testimonial.name}</Heading>
                    <Text fontSize="xs" color="textSecondary.default">{testimonial.role}</Text>
                  </Box>
                </HStack>
                <HStack mb={3}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FiZap key={i} size={12} style={{ color: 'var(--chakra-colors-accent-500)' }} />
                  ))}
                </HStack>
                <Text color="textSecondary.default">{testimonial.comment}</Text>
              </Box>
            ))}
          </SimpleGrid>

          {/* Social Proof Stats */}
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={6} mt={16}>
            {[
              { number: '500+', label: 'Clientes Ativos', icon: FiUsers },
              { number: '10,000+', label: 'Sessões Concluídas', icon: FiTarget },
              { number: '4.9/5', label: 'Avaliação Média', icon: FiClock },
              { number: '98%', label: 'Taxa de Satisfação', icon: FiZap },
            ].map((stat) => (
              <Box key={stat.label} textAlign="center" p={6} bg={cardBg} borderRadius="lg">
                <HStack justify="center" mb={2}>
                  <Icon as={stat.icon} boxSize={6} color="brand.500" />
                </HStack>
                <Heading size="lg" color="brand.500">{stat.number}</Heading>
                <Text fontSize="sm" color="textSecondary.default" mt={2}>{stat.label}</Text>
              </Box>
            ))}
          </Grid>
        </Container>
      </Box>

      <Divider />

      {/* Footer */}
      <Box as="footer" bg={cardBg} py={12}>
        <Container maxW="7xl">
          <Grid templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' }} gap={8} mb={8}>
            {/* Brand */}
            <VStack align="start" spacing={3}>
              <HStack spacing={2}>
                <Box bg="brand.500" p={2} borderRadius="md">
                  <Text fontWeight={800} color="white">V</Text>
                </Box>
                <Heading size="sm">Vigora</Heading>
              </HStack>
              <Text fontSize="sm" color="textSecondary.default">
                Plataforma de treino personalizado com treinadores certificados e planos adaptados.
              </Text>
              <HStack spacing={3} mt={4}>
                <Icon as={FiFacebook} boxSize={5} cursor="pointer" _hover={{ color: 'brand.500' }} />
                <Icon as={FiInstagram} boxSize={5} cursor="pointer" _hover={{ color: 'brand.500' }} />
                <Icon as={FiTwitter} boxSize={5} cursor="pointer" _hover={{ color: 'brand.500' }} />
                <Icon as={FiLinkedin} boxSize={5} cursor="pointer" _hover={{ color: 'brand.500' }} />
              </HStack>
            </VStack>

            {/* Quick Links */}
            <VStack align="start" spacing={2}>
              <Heading size="sm" mb={2}>Quick Links</Heading>
              <Box as={RouterLink} to="/" _hover={{ color: 'brand.500' }} cursor="pointer">Home</Box>
              <Box as={RouterLink} to="/trainers" _hover={{ color: 'brand.500' }} cursor="pointer">Trainers</Box>
              <Box as={RouterLink} to="/plans" _hover={{ color: 'brand.500' }} cursor="pointer">Plans</Box>
              <Box as={RouterLink} to="/" _hover={{ color: 'brand.500' }} cursor="pointer">Classes</Box>
            </VStack>

            {/* Resources */}
            <VStack align="start" spacing={2}>
              <Heading size="sm" mb={2}>Resources</Heading>
              <Text cursor="pointer" _hover={{ color: 'brand.500' }} fontSize="sm">Blog & Articles</Text>
              <Text cursor="pointer" _hover={{ color: 'brand.500' }} fontSize="sm">FAQ</Text>
              <Text cursor="pointer" _hover={{ color: 'brand.500' }} fontSize="sm">Privacy Policy</Text>
              <Text cursor="pointer" _hover={{ color: 'brand.500' }} fontSize="sm">Terms of Service</Text>
            </VStack>

            {/* Contact */}
            <VStack align="start" spacing={3}>
              <Heading size="sm">Contact</Heading>
              <HStack spacing={2}>
                <Icon as={FiMail} boxSize={4} color="brand.500" />
                <Text fontSize="sm">info@vigora.pt</Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={FiPhone} boxSize={4} color="brand.500" />
                <Text fontSize="sm">+351 912 345 678</Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={FiMapPin} boxSize={4} color="brand.500" />
                <Text fontSize="sm">Lisboa, Portugal</Text>
              </HStack>
            </VStack>
          </Grid>

          {/* Newsletter */}
          <Box py={6} borderTop="1px solid" borderColor="gray.200">
            <VStack spacing={3} align="start">
              <Heading size="sm">Newsletter</Heading>
              <Text fontSize="sm" color="textSecondary.default">Subscreva para receber dicas e promoções exclusivas</Text>
              <HStack w="100%">
                <Input placeholder="Seu email" type="email" borderRadius="md" />
                <Button colorScheme="brand" whiteSpace="nowrap">Subscribe</Button>
              </HStack>
            </VStack>
          </Box>

          <Divider my={6} />

          {/* Copyright */}
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <Text fontSize="sm" color="textSecondary.default">
              © {new Date().getFullYear()} Vigora. Todos os direitos reservados.
            </Text>
            <Text fontSize="xs" color="textSecondary.default">
              Desenvolvido com ❤️ para fitness
            </Text>
          </HStack>
        </Container>
      </Box>
    </Box>
  );
};

export default Homepage;
