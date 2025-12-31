import {
  Box,
  Button,
  Card,
  CardBody,
  Badge,
  Collapse,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
  HStack,
  IconButton,
  Icon,
  Image,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, startOfWeek, isSameDay, addWeeks } from 'date-fns';
import { getMyClientProfile } from '../../services/clients';
import { listPlans, listSessions, listCompletion, upsertCompletion } from '../../services/plans';
import { uploadFile } from '../../services/uploads';
import type { TrainingPlan, CompletionLog } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { formatDateTime, normalizeDateOnly, weekdayLabels } from '../../utils/date';
import { recordBodyMetric, getCurrentMetrics } from '../../services/bodyMetrics';

const TrainingCalendarPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = useMemo(() => new Date(), []);

  const dayRange = useMemo(() => {
    const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const targetWeek = weekOffset === 0 ? baseWeek : addWeeks(baseWeek, weekOffset);
    return Array.from({ length: 7 }, (_, i) => addDays(targetWeek, i));
  }, [weekOffset]);

  const goToPrevWeek = () => setWeekOffset((o) => o - 1);
  const goToNextWeek = () => setWeekOffset((o) => o + 1);
  const goToCurrentWeek = () => setWeekOffset(0);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetSession, setTargetSession] = useState<{ sessionId: string; date: Date } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // States for completion modal with metrics
  const [completionModal, setCompletionModal] = useState<{ sessionId: string; date: Date } | null>(null);
  const [completionMetrics, setCompletionMetrics] = useState({ weight: '', muscleMass: '' });

  // Fetch current body metrics to pre-fill modal
  const { data: currentMetrics } = useQuery({
    queryKey: ['body-metrics', 'current'],
    queryFn: getCurrentMetrics,
  });

  const openCompletionModal = (sessionId: string, date: Date) => {
    // Pre-fill with current metrics if available
    setCompletionMetrics({
      weight: currentMetrics?.currentWeight?.toString() ?? '',
      muscleMass: currentMetrics?.currentMuscleMass?.toString() ?? '',
    });
    setCompletionModal({ sessionId, date });
  };

  const toggleCard = (cardKey: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  };

  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me'],
    queryFn: getMyClientProfile,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans', 'client'],
    enabled: Boolean(clientProfile?._id),
    queryFn: () => listPlans({ clientId: clientProfile?._id }),
  });

  const activePlan = useMemo(() => selectedPlan ?? plans?.items?.[0] ?? null, [plans, selectedPlan]);

  const { data: sessions } = useQuery({
    queryKey: ['sessions', activePlan?._id],
    enabled: Boolean(activePlan?._id),
    queryFn: () => (activePlan?._id ? listSessions(activePlan._id) : Promise.resolve([])),
  });

  const { data: completions } = useQuery({
    queryKey: ['completion', activePlan?._id, dayRange],
    enabled: Boolean(clientProfile?._id),
    queryFn: () =>
      listCompletion({
        clientId: clientProfile?._id,
        trainerId: clientProfile?.trainerId ?? undefined,
        from: normalizeDateOnly(dayRange[0]),
        to: normalizeDateOnly(dayRange[6]),
        limit: 50,
      }),
  });

  const completionMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; date: Date; status: 'DONE' | 'MISSED' }) => {
      if (!clientProfile?._id || !clientProfile?.trainerId || !activePlan?._id) {
        throw new Error('Perfil incompleto');
      }

      let proofImage: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file, { purpose: 'PROOF', metadata: { sessionId: payload.sessionId } });
        proofImage = uploaded.url;
      }

      return upsertCompletion({
        clientId: clientProfile._id,
        trainerId: clientProfile.trainerId,
        planId: activePlan._id,
        sessionId: payload.sessionId,
        date: normalizeDateOnly(payload.date),
        status: payload.status,
        reason: payload.status === 'MISSED' ? reason : undefined,
        proofImage,
      });
    },
    onSuccess: async () => {
      // Record body metrics if provided and status is DONE
      if (completionModal && (completionMetrics.weight || completionMetrics.muscleMass)) {
        try {
          await recordBodyMetric({
            weight: completionMetrics.weight ? parseFloat(completionMetrics.weight) : undefined,
            muscleMass: completionMetrics.muscleMass ? parseFloat(completionMetrics.muscleMass) : undefined,
          });
        } catch {
          // Silently fail metric recording
        }
      }
      
      toast({
        title: 'Registado',
        description: 'Estado do treino atualizado.',
        status: 'success',
      });
      setReason('');
      setFile(null);
      setTargetSession(null);
      setCompletionModal(null);
      setCompletionMetrics({ weight: '', muscleMass: '' });
      qc.invalidateQueries({ queryKey: ['completion'] });
      // Invalidate body metrics so they refresh automatically
      qc.invalidateQueries({ queryKey: ['body-metrics'] });
      // Invalidate stats so Dashboard updates
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao registar treino',
        description: err instanceof Error ? err.message : 'Ocorreu um erro',
        status: 'error',
      });
    },
  });

  const completionForSessionDay = (sessionId: string, date: Date): CompletionLog | undefined => {
    const iso = normalizeDateOnly(date);
    return completions?.items?.find((c) => c.sessionId === sessionId && normalizeDateOnly(new Date(c.date)) === iso);
  };

  return (
    <Box>
      <PageHeader
        title="Calendário de treinos"
        subtitle="Consulta sessões semanais, regista conclusão ou motivo de falha e adiciona comprovativo."
        extra={
          <Select
            w="240px"
            value={activePlan?._id ?? ''}
            onChange={(e) => {
              const plan = plans?.items?.find((p) => p._id === e.target.value) ?? null;
              setSelectedPlan(plan);
            }}
          >
            {(plans?.items ?? []).map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </Select>
        }
      />

      {/* Week navigation */}
      <Flex justify="center" align="center" gap={4} mb={6}>
        <IconButton
          aria-label="Semana anterior"
          icon={<Icon as={FiChevronLeft} boxSize={5} />}
          onClick={goToPrevWeek}
          variant="outline"
          colorScheme="brand"
          borderRadius="full"
          size="sm"
        />
        <HStack spacing={3}>
          <Text fontWeight={700} fontSize="md">
            {formatDateTime(dayRange[0], 'dd MMM')} - {formatDateTime(dayRange[6], 'dd MMM yyyy')}
          </Text>
          {weekOffset !== 0 && (
            <Button size="xs" variant="ghost" colorScheme="brand" onClick={goToCurrentWeek}>
              Hoje
            </Button>
          )}
        </HStack>
        <IconButton
          aria-label="Próxima semana"
          icon={<Icon as={FiChevronRight} boxSize={5} />}
          onClick={goToNextWeek}
          variant="outline"
          colorScheme="brand"
          borderRadius="full"
          size="sm"
        />
      </Flex>

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)',
          '2xl': 'repeat(7, 1fr)',
        }}
        gap={4}
      >
        {dayRange.map((date) => {
          // Filter by day of week and ensure the date fits the plan window.
          const sessionsForDay = (sessions ?? []).filter((s) => {
            if (s.dayOfWeek !== date.getDay()) return false;
            
            // Ensure date is within the plan start and end.
            if (activePlan?.startDate) {
              const planStart = new Date(activePlan.startDate);
              planStart.setHours(0, 0, 0, 0);
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);
              if (checkDate < planStart) return false;
            }
            if (activePlan?.endDate) {
              const planEnd = new Date(activePlan.endDate);
              planEnd.setHours(23, 59, 59, 999);
              if (date > planEnd) return false;
            }
            return true;
          });
          const hasSessions = sessionsForDay.length > 0;
          const isToday = isSameDay(date, today);
          return (
            <GridItem key={date.toISOString()}>
              <Card
                borderWidth={isToday ? '2px' : '1px'}
                borderColor={isToday ? 'brand.500' : hasSessions ? 'brand.200' : 'border'}
                bg={isToday ? 'rgba(51,183,158,0.12)' : hasSessions ? 'rgba(51,183,158,0.06)' : 'card'}
                borderRadius="16px"
                boxShadow={isToday ? '0 0 0 3px rgba(51,183,158,0.25), 0 4px 12px rgba(0,0,0,0.1)' : 'lg'}
                transition="all 0.2s ease"
                _hover={{ transform: 'translateY(-3px)', boxShadow: 'xl' }}
              >
                <CardBody>
                  <Flex justify="space-between" align="center" mb={3}>
                    <HStack spacing={2}>
                      <Text fontWeight={800} fontSize="lg">
                        {weekdayLabels[date.getDay()]}
                      </Text>
                      {isToday && (
                        <Badge colorScheme="brand" variant="solid" fontSize="xs" borderRadius="full">
                          HOJE
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="sm" color={isToday ? 'brand.600' : 'muted'} fontWeight={isToday ? 700 : 600}>
                      {formatDateTime(date, 'dd/MM')}
                    </Text>
                  </Flex>

                  {sessionsForDay.length === 0 && (
                    <Box
                      border="1px dashed"
                      borderColor="border"
                      borderRadius="12px"
                      p={4}
                      bg="whiteAlpha.300"
                      _dark={{ bg: 'whiteAlpha.100' }}
                    >
                      <Text color="muted" fontWeight={600}>
                        Sem treino agendado.
                      </Text>
                    </Box>
                  )}

                  <Stack spacing={3}>
                    {sessionsForDay.map((s) => {
                      const completion = completionForSessionDay(s._id!, date);
                      const status = completion?.status ?? 'PENDING';
                      const isDone = status === 'DONE';
                      const isFailed = status === 'MISSED';
                      const cardKey = `${date.toISOString()}-${s._id}`;
                      const isExpanded = expandedCards.has(cardKey);

                      const stateStyles =
                        status === 'DONE'
                          ? { bg: 'rgba(51,183,158,0.1)', borderColor: 'green.200' }
                          : isFailed
                            ? { bg: 'rgba(255,164,123,0.15)', borderColor: 'orange.200' }
                            : { bg: 'white', borderColor: 'brand.100' };
                      return (
                        <Box
                          key={s._id}
                          border="1px solid"
                          borderColor={stateStyles.borderColor}
                          borderRadius="14px"
                          bg={stateStyles.bg}
                          _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
                          boxShadow="md"
                          transition="all 0.3s ease"
                          overflow="hidden"
                        >
                          {/* Clickable header */}
                          <Flex
                            p={4}
                            justify="space-between"
                            align="center"
                            cursor="pointer"
                            onClick={() => toggleCard(cardKey)}
                            _hover={{ bg: 'rgba(0,0,0,0.02)' }}
                            transition="background 0.2s ease"
                          >
                            <Box>
                              <Text fontWeight={800} fontSize="md">
                                Sessão #{s.order ?? 0}
                              </Text>
                              <Text fontSize="xs" color="muted">
                                {s.exercises.length} exercício{s.exercises.length !== 1 ? 's' : ''}
                              </Text>
                            </Box>
                            <HStack spacing={2}>
                              <Badge colorScheme={isDone ? 'green' : isFailed ? 'orange' : 'gray'} borderRadius="full">
                                {isDone ? 'CONCLUÍDO' : isFailed ? 'FALHADO' : 'PENDENTE'}
                              </Badge>
                              <Text fontSize="lg" color="muted">
                                {isExpanded ? '▲' : '▼'}
                              </Text>
                            </HStack>
                          </Flex>

                          {/* Expandable content */}
                          <Collapse in={isExpanded} animateOpacity>
                            <Box px={4} pb={4}>
                              <Divider mb={3} />
                              {s.notes && (
                                <Text fontSize="sm" color="muted" mb={2}>
                                  {s.notes}
                                </Text>
                              )}
                              <Stack spacing={1}>
                                {s.exercises.map((ex, idx) => {
                                  const bulletColors = ['brand.400', 'accent.500', 'purple.400', 'blue.400'];
                                  const bulletColor = bulletColors[idx % bulletColors.length];
                                  return (
                                    <HStack key={ex._id} align="flex-start" spacing={2}>
                                      <Box w="8px" h="8px" borderRadius="full" bg={bulletColor} mt={1} />
                                      <Text fontSize="sm">
                                        <strong>{ex.name}</strong> — {ex.sets}x{ex.reps}
                                      </Text>
                                    </HStack>
                                  );
                                })}
                              </Stack>

                              <Flex gap={2} mt={4} wrap="wrap" align="center">
                                <Button
                                  size="sm"
                                  leftIcon={<FiEye />}
                                  variant="outline"
                                  colorScheme="brand"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/trainings/${s._id}`);
                                  }}
                                >
                                  Ver detalhes
                                </Button>
                                {!isDone && !isFailed && (
                                  <>
                                    <Button
                                      size="sm"
                                      colorScheme="brand"
                                      variant="solid"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openCompletionModal(s._id!, date);
                                      }}
                                      isDisabled={completionMutation.isPending}
                                      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                                    >
                                      Marcar concluído
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      colorScheme="orange"
                                      border="1px solid"
                                      borderColor="orange.200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTargetSession({ sessionId: s._id!, date });
                                      }}
                                      _hover={{ bg: 'orange.50' }}
                                      isDisabled={completionMutation.isPending}
                                    >
                                      Falhei este treino
                                    </Button>
                                  </>
                                )}
                              </Flex>

                              {isFailed && (
                                <Stack spacing={1} mt={3}>
                                  {completion?.reason && (
                                    <Text fontSize="sm" color="muted">
                                      Motivo: {completion.reason}
                                    </Text>
                                  )}
                                </Stack>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardBody>
              </Card>
            </GridItem>
          );
        })}
      </Grid>

      {/* Modal to log a missed workout */}
      <Modal 
        isOpen={!!targetSession} 
        onClose={() => {
          setTargetSession(null);
          setReason('');
          setFile(null);
        }}
        isCentered
        size="md"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent 
          borderRadius="20px" 
          mx={4}
          bg="white"
          _dark={{ bg: 'gray.800' }}
        >
          <ModalHeader pb={0}>
            <Flex align="center" gap={3}>
              <Box
                bg="orange.400"
                color="white"
                p={2}
                borderRadius="12px"
                fontSize="xl"
              >
                📝
              </Box>
              <Box>
                <Text fontWeight={700} fontSize="lg">Registar falta</Text>
                <Text fontSize="sm" color="gray.500" fontWeight={400}>
                  Explica o motivo e adiciona um comprovativo
                </Text>
              </Box>
            </Flex>
          </ModalHeader>
          <ModalCloseButton top={4} right={4} />
          
          <ModalBody py={6}>
            <Stack spacing={5}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight={600}>
                  💬 Motivo
                </FormLabel>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: indisposição, falta de tempo, lesão..."
                  borderRadius="12px"
                  rows={3}
                  _focus={{ borderColor: 'orange.400', boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight={600}>
                  📷 Comprovativo (opcional)
                </FormLabel>
                <Box
                  border="2px dashed"
                  borderColor={file ? 'green.300' : 'gray.200'}
                  borderRadius="12px"
                  p={5}
                  textAlign="center"
                  bg={file ? 'green.50' : 'gray.50'}
                  _dark={{ 
                    bg: file ? 'green.900' : 'gray.700',
                    borderColor: file ? 'green.500' : 'gray.600'
                  }}
                  transition="all 0.2s"
                  cursor="pointer"
                  _hover={{ 
                    borderColor: 'orange.300', 
                    bg: 'orange.50',
                    _dark: { bg: 'orange.900' }
                  }}
                  onClick={() => document.getElementById('file-input-modal')?.click()}
                >
                  <Input
                    id="file-input-modal"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    display="none"
                  />
                  {file ? (
                    <Box textAlign="center">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        maxH="120px"
                        borderRadius="8px"
                        mx="auto"
                        mb={2}
                        objectFit="cover"
                      />
                      <Text fontSize="sm" fontWeight={600} color="green.600" _dark={{ color: 'green.300' }}>
                        {file.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Clica para alterar
                      </Text>
                    </Box>
                  ) : (
                    <>
                      <Flex justify="center" mb={2}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 16V8M12 8L8 12M12 8L16 12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 15V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </Flex>
                      <Text fontSize="sm" fontWeight={500} color="gray.600" _dark={{ color: 'gray.300' }}>
                        Clica para escolher imagem
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        JPG, PNG ou GIF
                      </Text>
                    </>
                  )}
                </Box>
              </FormControl>

              <Flex gap={3} pt={2}>
                <Button
                  flex={1}
                  colorScheme="orange"
                  size="lg"
                  borderRadius="12px"
                  onClick={() => {
                    if (targetSession) {
                      completionMutation.mutate({ 
                        sessionId: targetSession.sessionId, 
                        date: targetSession.date, 
                        status: 'MISSED' 
                      });
                    }
                  }}
                  isLoading={completionMutation.isPending}
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s"
                >
                  Submeter falta
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  borderRadius="12px"
                  onClick={() => {
                    setTargetSession(null);
                    setReason('');
                    setFile(null);
                  }}
                >
                  Cancelar
                </Button>
              </Flex>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal to complete workout with metrics */}
      <Modal 
        isOpen={!!completionModal} 
        onClose={() => {
          setCompletionModal(null);
          setCompletionMetrics({ weight: '', muscleMass: '' });
        }}
        isCentered
        size="md"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent 
          borderRadius="20px" 
          mx={4}
          bg="white"
          _dark={{ bg: 'gray.800' }}
        >
          <ModalHeader pb={0}>
            <Flex align="center" gap={3}>
              <Box
                bg="brand.500"
                color="white"
                p={2}
                borderRadius="12px"
                fontSize="xl"
              >
                ✅
              </Box>
              <Box>
                <Text fontWeight={700} fontSize="lg">Concluir Treino</Text>
                <Text fontSize="sm" color="gray.500" fontWeight={400}>
                  Regista as tuas métricas atuais (opcional)
                </Text>
              </Box>
            </Flex>
          </ModalHeader>
          <ModalCloseButton top={4} right={4} />
          
          <ModalBody py={6}>
            <Stack spacing={5}>
              <Box p={4} bg="brand.50" _dark={{ bg: 'gray.700' }} borderRadius="12px">
                <Text fontWeight={600} mb={3} fontSize="sm">📊 Métricas Corporais (opcional)</Text>
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight={600}>Peso (kg)</FormLabel>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 70.5"
                      value={completionMetrics.weight}
                      onChange={(e) => setCompletionMetrics({ ...completionMetrics, weight: e.target.value })}
                      borderRadius="10px"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight={600}>Massa Muscular (%)</FormLabel>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 16.5"
                      value={completionMetrics.muscleMass}
                      onChange={(e) => setCompletionMetrics({ ...completionMetrics, muscleMass: e.target.value })}
                      borderRadius="10px"
                    />
                  </FormControl>
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  As métricas ajudam a acompanhar o teu progresso ao longo do tempo.
                </Text>
              </Box>

              <Flex gap={3}>
                <Button
                  flex={1}
                  colorScheme="brand"
                  size="lg"
                  borderRadius="12px"
                  onClick={() => {
                    if (completionModal) {
                      completionMutation.mutate({ 
                        sessionId: completionModal.sessionId, 
                        date: completionModal.date, 
                        status: 'DONE' 
                      });
                    }
                  }}
                  isLoading={completionMutation.isPending}
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s"
                >
                  Confirmar conclusão
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  borderRadius="12px"
                  onClick={() => {
                    setCompletionModal(null);
                    setCompletionMetrics({ weight: '', muscleMass: '' });
                  }}
                >
                  Cancelar
                </Button>
              </Flex>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TrainingCalendarPage;
