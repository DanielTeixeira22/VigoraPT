import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { FiChevronUp, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { listPlans, createPlan, listSessions, createSession, updateSession, deleteSession } from '../../services/plans';
import { getMyTrainerProfile } from '../../services/trainers';
import { listMyClients } from '../../services/clients';
import type { TrainingPlan, TrainingSession, ClientProfile } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { weekdayLabels } from '../../utils/date';

// Lista de exercícios predefinidos para o dropdown
const exerciseOptions = [
  // Peito
  { value: 'Supino reto', label: 'Supino reto', group: 'Peito' },
  { value: 'Supino inclinado', label: 'Supino inclinado', group: 'Peito' },
  { value: 'Supino declinado', label: 'Supino declinado', group: 'Peito' },
  { value: 'Crucifixo', label: 'Crucifixo', group: 'Peito' },
  { value: 'Crossover', label: 'Crossover', group: 'Peito' },
  { value: 'Flexões', label: 'Flexões', group: 'Peito' },
  { value: 'Peck deck', label: 'Peck deck', group: 'Peito' },
  // Costas
  { value: 'Puxada frontal', label: 'Puxada frontal', group: 'Costas' },
  { value: 'Puxada atrás', label: 'Puxada atrás', group: 'Costas' },
  { value: 'Remada curvada', label: 'Remada curvada', group: 'Costas' },
  { value: 'Remada baixa', label: 'Remada baixa', group: 'Costas' },
  { value: 'Remada unilateral', label: 'Remada unilateral', group: 'Costas' },
  { value: 'Pull-up', label: 'Pull-up', group: 'Costas' },
  { value: 'Pullover', label: 'Pullover', group: 'Costas' },
  { value: 'Levantamento terra', label: 'Levantamento terra', group: 'Costas' },
  // Ombros
  { value: 'Press militar', label: 'Press militar', group: 'Ombros' },
  { value: 'Elevação frontal', label: 'Elevação frontal', group: 'Ombros' },
  { value: 'Elevação lateral', label: 'Elevação lateral', group: 'Ombros' },
  { value: 'Elevação posterior', label: 'Elevação posterior', group: 'Ombros' },
  { value: 'Arnold press', label: 'Arnold press', group: 'Ombros' },
  { value: 'Encolhimentos', label: 'Encolhimentos', group: 'Ombros' },
  // Bíceps
  { value: 'Rosca direta', label: 'Rosca direta', group: 'Bíceps' },
  { value: 'Rosca alternada', label: 'Rosca alternada', group: 'Bíceps' },
  { value: 'Rosca martelo', label: 'Rosca martelo', group: 'Bíceps' },
  { value: 'Rosca concentrada', label: 'Rosca concentrada', group: 'Bíceps' },
  { value: 'Rosca scott', label: 'Rosca scott', group: 'Bíceps' },
  // Tríceps
  { value: 'Tríceps na polia', label: 'Tríceps na polia', group: 'Tríceps' },
  { value: 'Tríceps testa', label: 'Tríceps testa', group: 'Tríceps' },
  { value: 'Tríceps francês', label: 'Tríceps francês', group: 'Tríceps' },
  { value: 'Fundos', label: 'Fundos', group: 'Tríceps' },
  { value: 'Kickback', label: 'Kickback', group: 'Tríceps' },
  // Pernas
  { value: 'Agachamento livre', label: 'Agachamento livre', group: 'Pernas' },
  { value: 'Agachamento smith', label: 'Agachamento smith', group: 'Pernas' },
  { value: 'Leg press', label: 'Leg press', group: 'Pernas' },
  { value: 'Extensão de pernas', label: 'Extensão de pernas', group: 'Pernas' },
  { value: 'Curl de pernas', label: 'Curl de pernas', group: 'Pernas' },
  { value: 'Stiff', label: 'Stiff', group: 'Pernas' },
  { value: 'Avanço', label: 'Avanço', group: 'Pernas' },
  { value: 'Cadeira adutora', label: 'Cadeira adutora', group: 'Pernas' },
  { value: 'Cadeira abdutora', label: 'Cadeira abdutora', group: 'Pernas' },
  { value: 'Gémeos em pé', label: 'Gémeos em pé', group: 'Pernas' },
  { value: 'Gémeos sentado', label: 'Gémeos sentado', group: 'Pernas' },
  { value: 'Glúteo máquina', label: 'Glúteo máquina', group: 'Pernas' },
  { value: 'Hip thrust', label: 'Hip thrust', group: 'Pernas' },
  // Abdominais
  { value: 'Abdominal crunch', label: 'Abdominal crunch', group: 'Abdominais' },
  { value: 'Prancha', label: 'Prancha', group: 'Abdominais' },
  { value: 'Elevação de pernas', label: 'Elevação de pernas', group: 'Abdominais' },
  { value: 'Abdominal oblíquo', label: 'Abdominal oblíquo', group: 'Abdominais' },
  { value: 'Russian twist', label: 'Russian twist', group: 'Abdominais' },
  // Cardio
  { value: 'Corrida', label: 'Corrida', group: 'Cardio' },
  { value: 'Bicicleta', label: 'Bicicleta', group: 'Cardio' },
  { value: 'Elíptica', label: 'Elíptica', group: 'Cardio' },
  { value: 'Remo', label: 'Remo', group: 'Cardio' },
  { value: 'Saltar à corda', label: 'Saltar à corda', group: 'Cardio' },
  { value: 'HIIT', label: 'HIIT', group: 'Cardio' },
];

// Agrupar exercícios por grupo muscular
const exerciseGroups = exerciseOptions.reduce((acc, ex) => {
  if (!acc[ex.group]) acc[ex.group] = [];
  acc[ex.group].push(ex);
  return acc;
}, {} as Record<string, typeof exerciseOptions>);

const emptySession: Omit<TrainingSession, '_id' | 'planId'> = {
  dayOfWeek: 1,
  order: 0,
  notes: '',
  exercises: [],
};

const PlansPage = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const { isOpen: isPlanFormOpen, onToggle: togglePlanForm } = useDisclosure();
  const { isOpen: isSessionFormOpen, onToggle: toggleSessionForm } = useDisclosure();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [sessionDraft, setSessionDraft] = useState<Omit<TrainingSession, '_id' | 'planId'>>(emptySession);
  const [sessionEditingId, setSessionEditingId] = useState<string | null>(null);

  const { data: trainerProfile } = useQuery({
    queryKey: ['trainer', 'me'],
    queryFn: getMyTrainerProfile,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients', 'my'],
    queryFn: listMyClients,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans', selectedClient, trainerProfile?._id],
    enabled: Boolean(trainerProfile?._id),
    queryFn: () =>
      listPlans({
        trainerId: trainerProfile?._id,
        clientId: selectedClient || undefined,
        limit: 50,
      }),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', selectedPlan?._id],
    enabled: Boolean(selectedPlan?._id),
    queryFn: () => (selectedPlan?._id ? listSessions(selectedPlan._id) : Promise.resolve([])),
  });

  const planMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: (plan) => {
      toast({ title: 'Plano criado com sucesso!', status: 'success' });
      qc.invalidateQueries({ queryKey: ['plans'] });
      setSelectedPlan(plan);
      togglePlanForm();
      setTabIndex(1); // Go to sessions tab
    },
    onError: () => toast({ title: 'Erro ao criar plano', status: 'error' }),
  });

  const sessionMutation = useMutation({
    mutationFn: (payload: { planId: string; data: Omit<TrainingSession, '_id' | 'planId'> }) =>
      createSession(payload.planId, payload.data),
    onSuccess: () => {
      toast({ title: 'Sessão guardada!', status: 'success' });
      qc.invalidateQueries({ queryKey: ['sessions', selectedPlan?._id] });
      setSessionDraft(emptySession);
      setSessionEditingId(null);
      toggleSessionForm();
    },
    onError: () => toast({ title: 'Erro ao gravar sessão', status: 'error' }),
  });

  const sessionUpdateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<TrainingSession> }) => updateSession(payload.id, payload.data),
    onSuccess: () => {
      toast({ title: 'Sessão atualizada!', status: 'success' });
      qc.invalidateQueries({ queryKey: ['sessions', selectedPlan?._id] });
      setSessionDraft(emptySession);
      setSessionEditingId(null);
      toggleSessionForm();
    },
    onError: () => toast({ title: 'Erro ao atualizar sessão', status: 'error' }),
  });

  const sessionDeleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      toast({ title: 'Sessão removida', status: 'success' });
      qc.invalidateQueries({ queryKey: ['sessions', selectedPlan?._id] });
    },
    onError: () => toast({ title: 'Erro ao remover sessão', status: 'error' }),
  });

  const handlePlanSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trainerProfile?._id || !selectedClient) {
      toast({ title: 'Seleciona um cliente primeiro', status: 'warning' });
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload: Omit<TrainingPlan, '_id'> = {
      clientId: selectedClient,
      trainerId: trainerProfile._id,
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? ''),
      frequencyPerWeek: Number(form.get('frequencyPerWeek')) as 3 | 4 | 5,
      startDate: String(form.get('startDate') ?? ''),
      endDate: String(form.get('endDate') ?? '') || undefined,
    };
    planMutation.mutate(payload);
  };

  const handleAddExercise = () => {
    if (sessionDraft.exercises.length >= 10) {
      toast({ title: 'Máximo 10 exercícios por sessão', status: 'warning' });
      return;
    }
    setSessionDraft({
      ...sessionDraft,
      exercises: [...sessionDraft.exercises, { name: '', sets: 3, reps: 10, notes: '' }],
    });
  };

  const handleRemoveExercise = (idx: number) => {
    setSessionDraft({
      ...sessionDraft,
      exercises: sessionDraft.exercises.filter((_, i) => i !== idx),
    });
  };

  const handleSessionSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPlan?._id) return;
    if (sessionDraft.exercises.length === 0) {
      toast({ title: 'Adiciona pelo menos um exercício', status: 'warning' });
      return;
    }
    if (sessionEditingId) {
      sessionUpdateMutation.mutate({ id: sessionEditingId, data: sessionDraft });
    } else {
      sessionMutation.mutate({ planId: selectedPlan._id, data: sessionDraft });
    }
  };

  const groupedSessions = useMemo(() => {
    const map = new Map<number, TrainingSession[]>();
    (sessions ?? []).forEach((s) => {
      const arr = map.get(s.dayOfWeek) ?? [];
      arr.push(s);
      map.set(s.dayOfWeek, arr);
    });
    return map;
  }, [sessions]);

  const handleSelectPlan = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setTabIndex(1);
  };

  const handleStartEditSession = (s: TrainingSession) => {
    setSessionEditingId(s._id ?? null);
    setSessionDraft({
      dayOfWeek: s.dayOfWeek,
      order: s.order ?? 0,
      notes: s.notes,
      exercises: s.exercises ?? [],
    });
    if (!isSessionFormOpen) toggleSessionForm();
  };

  return (
    <Box>
      <PageHeader
        title="Planos de Treino"
        subtitle={selectedPlan ? `A gerir: ${selectedPlan.title}` : 'Seleciona ou cria um plano para começar.'}
        extra={
          <Select
            placeholder="Filtrar por cliente"
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setSelectedPlan(null);
            }}
            w="240px"
            bg="card"
          >
            {clients?.map((c: ClientProfile & { userId?: { username?: string; profile?: { firstName?: string; lastName?: string } } | string }) => {
              const name = typeof c.userId === 'object'
                ? (c.userId?.username || `${c.userId?.profile?.firstName ?? ''} ${c.userId?.profile?.lastName ?? ''}`.trim() || c._id)
                : c.userId;
              return (
                <option key={c._id} value={c._id}>
                  {name}
                </option>
              );
            })}
          </Select>
        }
      />

      <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="brand" variant="enclosed">
        <TabList>
          <Tab>📋 Planos</Tab>
          <Tab isDisabled={!selectedPlan}>📅 Sessões {selectedPlan && `(${selectedPlan.title})`}</Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: PLANOS */}
          <TabPanel px={0}>
            <Box mb={4}>
              <Button
                leftIcon={isPlanFormOpen ? <FiChevronUp /> : <FiPlus />}
                onClick={togglePlanForm}
                colorScheme="brand"
                variant={isPlanFormOpen ? 'outline' : 'solid'}
              >
                {isPlanFormOpen ? 'Fechar formulário' : 'Novo Plano'}
              </Button>
            </Box>

            <Collapse in={isPlanFormOpen} animateOpacity>
              <Card mb={6} borderColor="brand.200" borderWidth="2px">
                <CardBody>
                  <Text fontWeight={700} mb={4}>Criar novo plano</Text>
                  <form onSubmit={handlePlanSubmit}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Título</FormLabel>
                        <Input name="title" placeholder="Ex: Plano de Hipertrofia" />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Frequência semanal</FormLabel>
                        <Select name="frequencyPerWeek" defaultValue="3">
                          <option value="3">3x por semana</option>
                          <option value="4">4x por semana</option>
                          <option value="5">5x por semana</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Data início</FormLabel>
                        <Input type="date" name="startDate" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Data fim (opcional)</FormLabel>
                        <Input type="date" name="endDate" />
                      </FormControl>
                      <FormControl gridColumn={{ md: 'span 2' }}>
                        <FormLabel>Descrição</FormLabel>
                        <Textarea name="description" placeholder="Objetivos e notas gerais..." />
                      </FormControl>
                    </SimpleGrid>
                    <Button type="submit" mt={4} colorScheme="brand" isLoading={planMutation.isPending}>
                      Criar Plano
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </Collapse>

            {/* Lista de planos */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {(plans?.items ?? []).map((p) => (
                <Card
                  key={p._id}
                  cursor="pointer"
                  onClick={() => handleSelectPlan(p)}
                  borderWidth="2px"
                  borderColor={selectedPlan?._id === p._id ? 'brand.400' : 'transparent'}
                  bg={selectedPlan?._id === p._id ? 'rgba(51,183,158,0.08)' : 'card'}
                  _hover={{ borderColor: 'brand.200', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  <CardBody>
                    <Flex justify="space-between" align="flex-start" mb={2}>
                      <Text fontWeight={700} fontSize="lg">{p.title}</Text>
                      <Badge colorScheme="brand" fontSize="sm">{p.frequencyPerWeek}x/semana</Badge>
                    </Flex>
                    <Text fontSize="sm" color="muted" noOfLines={2}>
                      {p.description || 'Sem descrição'}
                    </Text>
                    {selectedPlan?._id === p._id && (
                      <Badge mt={3} colorScheme="green">✓ Selecionado</Badge>
                    )}
                  </CardBody>
                </Card>
              ))}
              {(plans?.items?.length ?? 0) === 0 && (
                <Text color="muted">Ainda não há planos. Cria o primeiro acima!</Text>
              )}
            </SimpleGrid>
          </TabPanel>

          {/* TAB 2: SESSÕES */}
          <TabPanel px={0}>
            {selectedPlan && (
              <>
                <Flex justify="space-between" align="center" mb={4}>
                  <Box>
                    <Text fontWeight={700} fontSize="lg">{selectedPlan.title}</Text>
                    <Text fontSize="sm" color="muted">{selectedPlan.frequencyPerWeek}x por semana</Text>
                  </Box>
                  <Button
                    leftIcon={isSessionFormOpen ? <FiChevronUp /> : <FiPlus />}
                    onClick={() => {
                      if (isSessionFormOpen) {
                        setSessionDraft(emptySession);
                        setSessionEditingId(null);
                      }
                      toggleSessionForm();
                    }}
                    colorScheme="brand"
                    variant={isSessionFormOpen ? 'outline' : 'solid'}
                  >
                    {isSessionFormOpen ? 'Fechar' : 'Nova Sessão'}
                  </Button>
                </Flex>

                <Collapse in={isSessionFormOpen} animateOpacity>
                  <Card mb={6} borderColor="brand.200" borderWidth="2px">
                    <CardBody>
                      <Text fontWeight={700} mb={4}>
                        {sessionEditingId ? 'Editar sessão' : 'Criar nova sessão'}
                      </Text>
                      <form onSubmit={handleSessionSubmit}>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                          <FormControl>
                            <FormLabel>Dia da semana</FormLabel>
                            <Select
                              value={sessionDraft.dayOfWeek}
                              onChange={(e) =>
                                setSessionDraft({
                                  ...sessionDraft,
                                  dayOfWeek: Number.parseInt(e.target.value, 10) as TrainingSession['dayOfWeek'],
                                })
                              }
                            >
                              {Object.entries(weekdayLabels).map(([idx, lbl]) => (
                                <option key={idx} value={idx}>{lbl}</option>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl>
                            <FormLabel>Ordem</FormLabel>
                            <NumberInput
                              value={sessionDraft.order}
                              min={0}
                              onChange={(_, v) => setSessionDraft({ ...sessionDraft, order: Number.isNaN(v) ? 0 : v })}
                            >
                              <NumberInputField />
                            </NumberInput>
                          </FormControl>
                          <FormControl>
                            <FormLabel>Notas</FormLabel>
                            <Input
                              value={sessionDraft.notes || ''}
                              onChange={(e) => setSessionDraft({ ...sessionDraft, notes: e.target.value })}
                              placeholder="Foco, aquecimento, etc..."
                            />
                          </FormControl>
                        </SimpleGrid>

                        <Divider my={4} />

                        <Flex justify="space-between" align="center" mb={3}>
                          <Text fontWeight={600}>Exercícios ({sessionDraft.exercises.length}/10)</Text>
                          <Button leftIcon={<FiPlus />} size="sm" onClick={handleAddExercise} isDisabled={sessionDraft.exercises.length >= 10}>
                            Adicionar
                          </Button>
                        </Flex>

                        <Stack spacing={3}>
                          {sessionDraft.exercises.map((ex, idx) => (
                            <Box key={idx} p={3} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="md" position="relative">
                              <IconButton
                                aria-label="Remover"
                                icon={<FiTrash2 />}
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                position="absolute"
                                top={2}
                                right={2}
                                onClick={() => handleRemoveExercise(idx)}
                              />
                              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
                                <FormControl>
                                  <FormLabel fontSize="sm">Nome</FormLabel>
                                  <Select
                                    size="sm"
                                    value={ex.name}
                                    placeholder="Selecionar exercício"
                                    onChange={(e) => {
                                      const exercises = [...sessionDraft.exercises];
                                      exercises[idx] = { ...exercises[idx], name: e.target.value };
                                      setSessionDraft({ ...sessionDraft, exercises });
                                    }}
                                  >
                                    {Object.entries(exerciseGroups).map(([group, exs]) => (
                                      <optgroup key={group} label={group}>
                                        {exs.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormControl>
                                  <FormLabel fontSize="sm">Séries</FormLabel>
                                  <NumberInput
                                    size="sm"
                                    min={1}
                                    value={ex.sets}
                                    onChange={(_, v) => {
                                      const exercises = [...sessionDraft.exercises];
                                      exercises[idx] = { ...exercises[idx], sets: Number.isNaN(v) ? 1 : v };
                                      setSessionDraft({ ...sessionDraft, exercises });
                                    }}
                                  >
                                    <NumberInputField />
                                  </NumberInput>
                                </FormControl>
                                <FormControl>
                                  <FormLabel fontSize="sm">Reps</FormLabel>
                                  <NumberInput
                                    size="sm"
                                    min={1}
                                    value={ex.reps}
                                    onChange={(_, v) => {
                                      const exercises = [...sessionDraft.exercises];
                                      exercises[idx] = { ...exercises[idx], reps: Number.isNaN(v) ? 1 : v };
                                      setSessionDraft({ ...sessionDraft, exercises });
                                    }}
                                  >
                                    <NumberInputField />
                                  </NumberInput>
                                </FormControl>
                                <FormControl>
                                  <FormLabel fontSize="sm">Link vídeo</FormLabel>
                                  <Input
                                    size="sm"
                                    value={ex.mediaUrl || ''}
                                    placeholder="youtube.com/..."
                                    onChange={(e) => {
                                      const exercises = [...sessionDraft.exercises];
                                      exercises[idx] = { ...exercises[idx], mediaUrl: e.target.value };
                                      setSessionDraft({ ...sessionDraft, exercises });
                                    }}
                                  />
                                </FormControl>
                              </SimpleGrid>
                            </Box>
                          ))}
                          {sessionDraft.exercises.length === 0 && (
                            <Text color="muted" fontSize="sm">Clica em "Adicionar" para inserir exercícios.</Text>
                          )}
                        </Stack>

                        <Button
                          type="submit"
                          mt={4}
                          colorScheme="brand"
                          isLoading={sessionMutation.isPending || sessionUpdateMutation.isPending}
                        >
                          {sessionEditingId ? 'Atualizar Sessão' : 'Guardar Sessão'}
                        </Button>
                      </form>
                    </CardBody>
                  </Card>
                </Collapse>

                {/* Lista de sessões por dia */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {[...groupedSessions.entries()]
                    .sort(([a], [b]) => a - b)
                    .map(([day, arr]) => (
                      <Card key={day}>
                        <CardBody>
                          <Text fontWeight={700} mb={3}>{weekdayLabels[day]}</Text>
                          <Stack spacing={3}>
                            {arr.map((s) => (
                              <Box key={s._id} p={3} bg="gray.50" _dark={{ bg: 'gray.700' }} borderRadius="md" borderLeft="4px solid" borderLeftColor="brand.400">
                                <Flex justify="space-between" align="center" mb={2}>
                                  <Text fontWeight={600}>Sessão #{s.order ?? 0}</Text>
                                  <HStack spacing={1}>
                                    <IconButton
                                      aria-label="Editar"
                                      icon={<FiEdit2 />}
                                      size="xs"
                                      onClick={() => handleStartEditSession(s)}
                                    />
                                    <IconButton
                                      aria-label="Apagar"
                                      icon={<FiTrash2 />}
                                      size="xs"
                                      colorScheme="red"
                                      variant="ghost"
                                      onClick={() => s._id && sessionDeleteMutation.mutate(s._id)}
                                    />
                                  </HStack>
                                </Flex>
                                {s.notes && <Text fontSize="xs" color="muted" mb={2}>{s.notes}</Text>}
                                <Stack spacing={1}>
                                  {s.exercises.map((ex) => (
                                    <Text key={ex._id} fontSize="sm">
                                      • <strong>{ex.name}</strong> — {ex.sets}x{ex.reps}
                                    </Text>
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </CardBody>
                      </Card>
                    ))}
                </SimpleGrid>
                {(sessions?.length ?? 0) === 0 && (
                  <Text color="muted" mt={4}>Este plano ainda não tem sessões. Cria a primeira acima!</Text>
                )}
              </>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default PlansPage;
