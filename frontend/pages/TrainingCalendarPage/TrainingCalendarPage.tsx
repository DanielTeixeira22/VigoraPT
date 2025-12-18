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
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
  HStack,
  IconButton,
  Icon,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { addDays, startOfWeek, isSameDay, addWeeks } from 'date-fns';
import { getMyClientProfile } from '../../services/clients';
import { listPlans, listSessions, listCompletion, upsertCompletion } from '../../services/plans';
import { uploadFile } from '../../services/uploads';
import type { TrainingPlan, CompletionLog } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { formatDateTime, normalizeDateOnly, weekdayLabels } from '../../utils/date';

const TrainingCalendarPage = () => {
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
  const [targetSession, setTargetSession] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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
    onSuccess: () => {
      toast({
        title: 'Registado',
        description: 'Estado do treino atualizado.',
        status: 'success',
      });
      setReason('');
      setFile(null);
      setTargetSession(null);
      qc.invalidateQueries({ queryKey: ['completion', activePlan?._id] });
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

      {/* Navegação entre semanas */}
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
          const sessionsForDay = (sessions ?? []).filter((s) => s.dayOfWeek === date.getDay());
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
                          {/* Cabeçalho clicável */}
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

                          {/* Conteúdo expansível */}
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
                                {!isDone && !isFailed && (
                                  <>
                                    <Button
                                      size="sm"
                                      colorScheme="brand"
                                      variant="solid"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        completionMutation.mutate({ sessionId: s._id!, date, status: 'DONE' });
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
                                        setTargetSession(s._id || null);
                                      }}
                                      _hover={{ bg: 'orange.50' }}
                                      isDisabled={completionMutation.isPending}
                                    >
                                      Falhei este treino
                                    </Button>
                                  </>
                                )}
                              </Flex>

                              {targetSession === s._id && (
                                <Box
                                  mt={4}
                                  p={3}
                                  border="1px dashed"
                                  borderColor="border"
                                  borderRadius="12px"
                                  bg="rgba(255,166,43,0.06)"
                                >
                                  <FormControl>
                                    <FormLabel fontSize="sm">Motivo</FormLabel>
                                    <Textarea
                                      value={reason}
                                      onChange={(e) => setReason(e.target.value)}
                                      placeholder="Ex.: indisposição, falta de tempo..."
                                    />
                                  </FormControl>
                                  <FormControl mt={2}>
                                    <FormLabel fontSize="sm">Comprovativo (imagem)</FormLabel>
                                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                                  </FormControl>
                                  <Button
                                    size="sm"
                                    mt={3}
                                    colorScheme="orange"
                                    onClick={() => completionMutation.mutate({ sessionId: s._id!, date, status: 'MISSED' })}
                                    isLoading={completionMutation.isPending}
                                  >
                                    Submeter falta
                                  </Button>
                                </Box>
                              )}

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
    </Box>
  );
};

export default TrainingCalendarPage;
