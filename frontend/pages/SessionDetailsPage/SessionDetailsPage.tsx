import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Stack,
  Text,
  Badge,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlay, FiExternalLink } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyClientProfile } from '../../services/clients';
import { listPlans, listSessions } from '../../services/plans';
import type { TrainingSession, Exercise } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { weekdayLabels } from '../../utils/date';

const SessionDetailsPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me'],
    queryFn: getMyClientProfile,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans', 'client'],
    enabled: Boolean(clientProfile?._id),
    queryFn: () => listPlans({ clientId: clientProfile?._id }),
  });

  const activePlan = plans?.items?.[0] ?? null;

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', activePlan?._id],
    enabled: Boolean(activePlan?._id),
    queryFn: () => (activePlan?._id ? listSessions(activePlan._id) : Promise.resolve([])),
  });

  const session: TrainingSession | undefined = sessions?.find((s) => s._id === sessionId);

  const getVideoEmbedUrl = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    return null;
  };

  const isYoutubeUrl = (url: string): boolean => {
    return /youtube\.com|youtu\.be/i.test(url);
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Container maxW="container.lg" py={8}>
        <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/trainings')} mb={4}>
          Voltar
        </Button>
        <Text color="muted">Sessão não encontrada.</Text>
      </Container>
    );
  }

  return (
    <Box>
      <PageHeader
        title={`Sessão #${session.order ?? 0}`}
        subtitle={`${weekdayLabels[session.dayOfWeek]} • ${session.exercises.length} exercício${session.exercises.length !== 1 ? 's' : ''}`}
        extra={
          <Button
            leftIcon={<FiArrowLeft />}
            onClick={() => navigate('/trainings')}
            variant="outline"
            colorScheme="brand"
          >
            Voltar ao calendário
          </Button>
        }
      />

      {session.notes && (
        <Card mb={6} bg="rgba(51,183,158,0.08)" borderColor="brand.200" borderWidth="1px">
          <CardBody>
            <Text fontWeight={600} color="brand.600" mb={1}>
              📝 Notas do treinador
            </Text>
            <Text>{session.notes}</Text>
          </CardBody>
        </Card>
      )}

      <Stack spacing={4}>
        {session.exercises.map((ex: Exercise, idx: number) => {
          const hasVideo = ex.mediaUrl && ex.mediaUrl.trim() !== '';
          const embedUrl = hasVideo ? getVideoEmbedUrl(ex.mediaUrl!) : null;

          return (
            <Card
              key={ex._id || idx}
              borderWidth="2px"
              borderColor="brand.100"
              _hover={{ borderColor: 'brand.300', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <CardBody>
                <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
                  <Box flex="1" minW="200px">
                    <HStack spacing={3} mb={2}>
                      <Badge
                        colorScheme="brand"
                        fontSize="sm"
                        borderRadius="full"
                        px={3}
                        py={1}
                      >
                        #{idx + 1}
                      </Badge>
                      <Heading as="h3" size="md" fontWeight={700}>
                        {ex.name}
                      </Heading>
                    </HStack>

                    <HStack spacing={6} mt={3}>
                      <Box textAlign="center" p={3} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="lg">
                        <Text fontSize="2xl" fontWeight={800} color="brand.500">
                          {ex.sets}
                        </Text>
                        <Text fontSize="sm" color="muted" fontWeight={600}>
                          Séries
                        </Text>
                      </Box>
                      <Text fontSize="2xl" color="muted">×</Text>
                      <Box textAlign="center" p={3} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="lg">
                        <Text fontSize="2xl" fontWeight={800} color="accent.500">
                          {ex.reps}
                        </Text>
                        <Text fontSize="sm" color="muted" fontWeight={600}>
                          Repetições
                        </Text>
                      </Box>
                    </HStack>

                    {ex.notes && (
                      <Text fontSize="sm" color="muted" mt={3} fontStyle="italic">
                        💡 {ex.notes}
                      </Text>
                    )}
                  </Box>

                  {hasVideo && (
                    <Box minW="280px" maxW="400px" flex="1">
                      <Divider display={{ base: 'block', md: 'none' }} mb={4} />
                      
                      {embedUrl ? (
                        <Box>
                          <Text fontSize="sm" fontWeight={600} color="muted" mb={2}>
                            🎬 Vídeo demonstrativo
                          </Text>
                          <Box
                            as="iframe"
                            src={embedUrl}
                            width="100%"
                            height="200px"
                            borderRadius="12px"
                            border="none"
                            allowFullScreen
                          />
                        </Box>
                      ) : (
                        <Link href={ex.mediaUrl} isExternal>
                          <Button
                            leftIcon={<Icon as={isYoutubeUrl(ex.mediaUrl!) ? FiPlay : FiExternalLink} />}
                            colorScheme="brand"
                            variant="outline"
                            size="lg"
                            w="100%"
                          >
                            Ver vídeo
                          </Button>
                        </Link>
                      )}
                    </Box>
                  )}
                </Flex>
              </CardBody>
            </Card>
          );
        })}
      </Stack>

      {session.exercises.length === 0 && (
        <Card>
          <CardBody>
            <Text color="muted" textAlign="center">
              Esta sessão ainda não tem exercícios definidos.
            </Text>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default SessionDetailsPage;
