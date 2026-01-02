import { 
  Box, 
  Grid, 
  GridItem, 
  Heading, 
  Select, 
  SimpleGrid, 
  Stack, 
  Text, 
  useColorModeValue,
  Flex,
  Badge,
  Avatar,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Image,
  HStack,
  VStack,
  Icon,
} from '@chakra-ui/react';
import { FiAlertCircle, FiCalendar, FiMessageCircle, FiImage } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { useMemo, useState } from 'react';
import { completionsByMonth, completionsByWeek, myCompletionsByMonth, myCompletionsByWeek, getAdminOverview } from '../../services/stats';
import { listCompletion } from '../../services/plans';
import type { ClientProfile, CompletionLog } from '../../types/domain';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import { formatDay } from '../../utils/date';
import { resolveBackendUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import { listMyClients, getMyClientProfile } from '../../services/clients';
import { getMyTrainerProfile } from '../../services/trainers';
import ProgressCharts from '../../components/charts/ProgressCharts';

type ClientOption = ClientProfile & { userId?: { username?: string } };

// Dashboard with progress indicators and workout summary.
// Custom tooltip for charts.
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  const bg = useColorModeValue('white', '#1a1a2e');
  const border = useColorModeValue('#e2e8f0', '#3a3a50');
  
  if (active && payload && payload.length) {
    return (
      <Box
        bg={bg}
        border="1px solid"
        borderColor={border}
        borderRadius="12px"
        p={3}
        boxShadow="lg"
      >
        <Text fontSize="xs" fontWeight={600} color="gray.500" mb={1}>
          {label}
        </Text>
        <Text fontSize="lg" fontWeight={700} color="brand.500">
          {payload[0].value} treinos
        </Text>
      </Box>
    );
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CompletionChart = ({ data, dataKey }: { data: any[]; dataKey: string }) => {
  const gridColor = useColorModeValue('#f0f0f5', '#2a2a3a');
  const axisColor = useColorModeValue('#a0aec0', '#4a5568');
  
  // Determine the max value to highlight the top bar.
  const maxValue = Math.max(...data.map(d => d.totalCompletions));
  
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#33b79e" stopOpacity={1} />
            <stop offset="50%" stopColor="#4fd1b1" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ffa92e" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="barGradientHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ec4a0" stopOpacity={1} />
            <stop offset="50%" stopColor="#5fe3c3" stopOpacity={1} />
            <stop offset="100%" stopColor="#ffb74d" stopOpacity={0.95} />
          </linearGradient>
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#33b79e" floodOpacity="0.2"/>
          </filter>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={gridColor} 
          vertical={false}
        />
        <XAxis 
          dataKey={dataKey} 
          tick={{ fontSize: 12, fill: axisColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
          dy={10}
        />
        <YAxis 
          allowDecimals={false} 
          tick={{ fontSize: 12, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          dx={-5}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 183, 158, 0.08)', radius: 8 }} />
        <Bar 
          dataKey="totalCompletions" 
          radius={[10, 10, 6, 6]}
          maxBarSize={55}
          animationDuration={800}
          animationBegin={100}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={entry.totalCompletions === maxValue ? 'url(#barGradientHighlight)' : 'url(#barGradient)'}
              style={{ filter: entry.totalCompletions === maxValue ? 'url(#barShadow)' : 'none' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedMiss, setSelectedMiss] = useState<CompletionLog | null>(null);

  const { data: trainerProfile } = useQuery({
    queryKey: ['trainer', 'me', 'for-dashboard'],
    enabled: user?.role === 'TRAINER',
    queryFn: getMyTrainerProfile,
  });

  const { data: myClients } = useQuery({
    queryKey: ['clients', 'my', 'for-dashboard'],
    enabled: user?.role === 'TRAINER',
    queryFn: listMyClients,
  });

  const { data: weekly } = useQuery({
    queryKey: ['stats', 'weekly', selectedClient],
    queryFn: () =>
      selectedClient
        ? completionsByWeek({ clientId: selectedClient })
        : user?.role === 'TRAINER'
          ? completionsByWeek({ trainerId: trainerProfile?._id })
          : myCompletionsByWeek(),
    // Apenas TRAINER ou CLIENT têm stats - ADMIN não tem stats próprias
    enabled: user?.role === 'CLIENT' || (user?.role === 'TRAINER' && (Boolean(trainerProfile?._id) || Boolean(selectedClient))),
  });
  const { data: monthly } = useQuery({
    queryKey: ['stats', 'monthly', selectedClient],
    queryFn: () =>
      selectedClient
        ? completionsByMonth({ clientId: selectedClient })
        : user?.role === 'TRAINER'
          ? completionsByMonth({ trainerId: trainerProfile?._id })
          : myCompletionsByMonth(),
    // Apenas TRAINER ou CLIENT têm stats - ADMIN não tem stats próprias
    enabled: user?.role === 'CLIENT' || (user?.role === 'TRAINER' && (Boolean(trainerProfile?._id) || Boolean(selectedClient))),
  });
  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me', 'for-dashboard'],
    enabled: user?.role === 'CLIENT',
    queryFn: getMyClientProfile,
  });

  const { data: missed } = useQuery({
    queryKey: ['completion', 'missed', user?.role, clientProfile?._id, trainerProfile?._id],
    queryFn: () =>
      user?.role === 'CLIENT'
        ? listCompletion({ clientId: clientProfile?._id, status: 'MISSED', limit: 5 })
        : listCompletion({ trainerId: trainerProfile?._id, status: 'MISSED', limit: 5 }),
    enabled: user?.role === 'CLIENT' ? Boolean(clientProfile?._id) : Boolean(trainerProfile?._id),
  });

  // Admin-specific stats
  const { data: adminStats } = useQuery({
    queryKey: ['stats', 'admin', 'overview'],
    queryFn: getAdminOverview,
    enabled: user?.role === 'ADMIN',
  });

  // Calculate totals based on role
  const totalWeekly = useMemo(() => {
    if (user?.role === 'ADMIN' && adminStats) {
      return adminStats.weeklyActivity.reduce((acc, cur) => acc + cur.totalCompletions, 0);
    }
    return weekly?.reduce((acc, cur) => acc + cur.totalCompletions, 0) ?? 0;
  }, [weekly, adminStats, user?.role]);

  const totalMonthly = useMemo(() => {
    if (user?.role === 'ADMIN' && adminStats) {
      return adminStats.monthlyActivity.reduce((acc, cur) => acc + cur.totalCompletions, 0);
    }
    return monthly?.reduce((acc, cur) => acc + cur.totalCompletions, 0) ?? 0;
  }, [monthly, adminStats, user?.role]);

  // Format weekly data for the chart.
  const formattedWeekly = useMemo(() => {
    const data = user?.role === 'ADMIN' && adminStats ? adminStats.weeklyActivity : weekly;
    if (!data) return [];
    // Sort by year+week and format the label.
    return [...data]
      .sort((a, b) => (a.year * 100 + (a.week || 0)) - (b.year * 100 + (b.week || 0)))
      .map(d => ({
        ...d,
        week: `Sem ${d.week}`,
      }));
  }, [weekly, adminStats, user?.role]);

  // Format monthly data for the chart.
  const formattedMonthly = useMemo(() => {
    const data = user?.role === 'ADMIN' && adminStats ? adminStats.monthlyActivity : monthly;
    if (!data) return [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return [...data]
      .sort((a, b) => (a.year * 100 + (a.month || 0)) - (b.year * 100 + (b.month || 0)))
      .map(d => ({
        ...d,
        month: monthNames[(d.month || 1) - 1],
      }));
  }, [monthly, adminStats, user?.role]);

  // Format monthly missed data for admin chart.
  const formattedMonthlyMissed = useMemo(() => {
    if (user?.role !== 'ADMIN' || !adminStats?.monthlyMissed) return [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return [...adminStats.monthlyMissed]
      .sort((a, b) => (a.year * 100 + (a.month || 0)) - (b.year * 100 + (b.month || 0)))
      .map(d => ({
        ...d,
        month: monthNames[(d.month || 1) - 1],
      }));
  }, [adminStats, user?.role]);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="KPIs rápidos, evolução semanal/mensal e alertas de treinos falhados."
        extra={
          <Stack direction="row" spacing={3} align="center">
            <Text color="muted">{user?.role}</Text>
            {user?.role === 'TRAINER' && (
              <Select
                size="sm"
                placeholder="Todos os clientes"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                w="240px"
              >
                {(myClients ?? []).map((c: ClientOption) => (
                  <option key={c._id} value={c._id}>
                    {c.userId?.username ?? c._id}
                  </option>
                ))}
              </Select>
            )}
          </Stack>
        }
      />

      {/* Admin-specific KPIs */}
      {user?.role === 'ADMIN' && adminStats && (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
            <StatCard 
              label="Total Utilizadores" 
              value={adminStats.totalUsers} 
              helper="Registados na plataforma"
            />
            <StatCard 
              label="Trainers Ativos" 
              value={adminStats.totalTrainers} 
              helper="Trainers aprovados"
            />
            <StatCard 
              label="Clientes" 
              value={adminStats.totalClients} 
              helper="Clientes registados"
            />
            <StatCard 
              label="Pedidos Pendentes" 
              value={adminStats.pendingApplications} 
              helper="Aguardam aprovação"
            />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
            <StatCard 
              label="Treinos Concluídos" 
              value={adminStats.totalWorkoutsCompleted} 
              helper="Total global de treinos"
            />
            <StatCard 
              label="Treinos Falhados" 
              value={adminStats.totalWorkoutsMissed} 
              helper="Total global de faltas"
            />
            <StatCard 
              label="Taxa de Sucesso" 
              value={adminStats.totalWorkoutsCompleted + adminStats.totalWorkoutsMissed > 0 
                ? `${Math.round((adminStats.totalWorkoutsCompleted / (adminStats.totalWorkoutsCompleted + adminStats.totalWorkoutsMissed)) * 100)}%`
                : '—'
              } 
              helper="Treinos concluídos vs falhados"
            />
          </SimpleGrid>
        </>
      )}

      {/* Client/Trainer KPIs */}
      {user?.role !== 'ADMIN' && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
          <StatCard label="Total semanal" value={totalWeekly} helper="Treinos concluídos esta semana" />
          <StatCard label="Total mensal" value={totalMonthly} helper="Treinos concluídos este mês" />
          <StatCard
            label="Falhas recentes"
            value={missed?.items?.length ?? 0}
            helper="Últimos registos de falta"
          />
        </SimpleGrid>
      )}

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <Heading size="md" mb={3}>
            Evolução semanal
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            <CompletionChart data={formattedWeekly} dataKey="week" />
          </Box>
        </GridItem>
        <GridItem>
          <Heading size="md" mb={3}>
            Evolução mensal
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            <CompletionChart data={formattedMonthly} dataKey="month" />
          </Box>
        </GridItem>
      </Grid>

      {/* Body Metrics Evolution - Only for Clients */}
      {user?.role === 'CLIENT' && (
        <Box mt={8}>
          <Heading size="md" mb={3}>
            📊 Evolução Corporal
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            <ProgressCharts limit={30} />
          </Box>
        </Box>
      )}

      {/* Missed workouts chart for Admin */}
      {user?.role === 'ADMIN' && adminStats && (
        <Box mt={8}>
          <Heading size="md" mb={3}>
            📉 Evolução de Faltas Mensais
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            {formattedMonthlyMissed.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={formattedMonthlyMissed} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalCompletions" name="Faltas" radius={[8, 8, 0, 0]} maxBarSize={50}>
                    {formattedMonthlyMissed.map((_, index) => (
                      <Cell key={`cell-missed-${index}`} fill="#E53E3E" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Flex direction="column" align="center" justify="center" py={8} color="gray.400">
                <Text fontWeight={500}>Sem faltas registadas</Text>
                <Text fontSize="sm">Excelente! Nenhum treino falhado. 🎉</Text>
              </Flex>
            )}
          </Box>
        </Box>
      )}

      {/* Faltas recentes - only for CLIENT and TRAINER */}
      {user?.role !== 'ADMIN' && (
        <Box mt={8} bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={5}>
        <Flex align="center" gap={2} mb={4}>
          <Icon as={FiAlertCircle} color="orange.400" boxSize={5} />
          <Heading size="md">Faltas recentes</Heading>
          {(missed?.items?.length ?? 0) > 0 && (
            <Badge colorScheme="orange" borderRadius="full" ml="auto">
              {missed?.items?.length}
            </Badge>
          )}
        </Flex>
        
        {(missed?.items?.length ?? 0) === 0 ? (
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            py={8}
            color="gray.400"
          >
            <Icon as={FiCalendar} boxSize={10} mb={3} />
            <Text fontWeight={500}>Sem faltas registadas</Text>
            <Text fontSize="sm">Todos os treinos foram completados! 🎉</Text>
          </Flex>
        ) : (
          <Stack spacing={3}>
            {(missed?.items ?? []).map((log: CompletionLog) => {
              // Get client info when the user is a trainer.
              const clientInfo = myClients?.find((c: ClientOption) => c._id === log.clientId);
              const clientUser = clientInfo?.userId as { username?: string; profile?: { firstName?: string; lastName?: string; avatarUrl?: string } } | undefined;
              
              return (
                <Box 
                  key={log._id} 
                  p={4} 
                  bg="whiteAlpha.600"
                  _dark={{ bg: 'whiteAlpha.50' }}
                  border="1px solid" 
                  borderColor="orange.100"
                  _hover={{ 
                    borderColor: 'orange.300', 
                    boxShadow: 'md',
                    transform: 'translateY(-2px)',
                    cursor: 'pointer'
                  }}
                  borderRadius="12px"
                  transition="all 0.2s"
                  onClick={() => setSelectedMiss(log)}
                >
                  <Flex justify="space-between" align="flex-start" gap={3}>
                    <Flex gap={3} align="center">
                      {user?.role === 'TRAINER' && clientUser && (
                        <Avatar 
                          size="sm" 
                          name={clientUser.profile?.firstName || clientUser.username}
                          src={resolveBackendUrl(clientUser.profile?.avatarUrl)}
                        />
                      )}
                      <VStack align="flex-start" spacing={0}>
                        <HStack spacing={2}>
                          <Text fontWeight={700} fontSize="md">{formatDay(log.date)}</Text>
                          <Badge colorScheme="orange" size="sm" borderRadius="full">FALHADO</Badge>
                        </HStack>
                        {user?.role === 'TRAINER' && clientUser && (
                          <Text fontSize="sm" color="gray.500">
                            {clientUser.profile?.firstName} {clientUser.profile?.lastName || clientUser.username}
                          </Text>
                        )}
                        <HStack spacing={1} mt={1}>
                          <Icon as={FiMessageCircle} boxSize={3} color="gray.400" />
                          <Text fontSize="sm" color="muted" noOfLines={1}>
                            {log.reason || 'Sem motivo indicado'}
                          </Text>
                        </HStack>
                      </VStack>
                    </Flex>
                    <VStack align="flex-end" spacing={1}>
                      {log.proofImage && (
                        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                          <HStack spacing={1}>
                            <Icon as={FiImage} boxSize={3} />
                            <Text>Com foto</Text>
                          </HStack>
                        </Badge>
                      )}
                    </VStack>
                  </Flex>
                </Box>
              );
            })}
        </Stack>
        )}
      </Box>
      )}

      {/* Modal for missed workout details */}
      <Modal isOpen={!!selectedMiss} onClose={() => setSelectedMiss(null)} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="16px" mx={4}>
          <ModalHeader pb={2}>
            <Flex align="center" gap={2}>
              <Icon as={FiAlertCircle} color="orange.400" />
              <Text>Detalhes da Falta</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedMiss && (
              <VStack spacing={4} align="stretch">
                {/* Date */}
                <Box p={3} bg="orange.50" _dark={{ bg: 'orange.900' }} borderRadius="12px">
                  <HStack spacing={3}>
                    <Icon as={FiCalendar} color="orange.500" boxSize={5} />
                    <Box>
                      <Text fontSize="sm" color="gray.500">Data</Text>
                      <Text fontWeight={700} fontSize="lg">{formatDay(selectedMiss.date)}</Text>
                    </Box>
                  </HStack>
                </Box>

                {/* Client info (for trainer) */}
                {user?.role === 'TRAINER' && (() => {
                  const clientInfo = myClients?.find((c: ClientOption) => c._id === selectedMiss.clientId);
                  const clientUser = clientInfo?.userId as { username?: string; profile?: { firstName?: string; lastName?: string; avatarUrl?: string } } | undefined;
                  if (!clientUser) return null;
                  return (
                    <Box p={3} bg="gray.50" _dark={{ bg: 'gray.800' }} borderRadius="12px">
                      <HStack spacing={3}>
                        <Avatar 
                          size="md" 
                          name={clientUser.profile?.firstName || clientUser.username}
                          src={resolveBackendUrl(clientUser.profile?.avatarUrl)}
                        />
                        <Box>
                          <Text fontSize="sm" color="gray.500">Cliente</Text>
                          <Text fontWeight={700}>
                            {clientUser.profile?.firstName} {clientUser.profile?.lastName || clientUser.username}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  );
                })()}

                {/* Reason */}
                <Box p={3} bg="gray.50" _dark={{ bg: 'gray.800' }} borderRadius="12px">
                  <HStack spacing={3} align="flex-start">
                    <Icon as={FiMessageCircle} color="gray.500" boxSize={5} mt={1} />
                    <Box>
                      <Text fontSize="sm" color="gray.500">Motivo</Text>
                      <Text fontWeight={500}>{selectedMiss.reason || 'Sem motivo indicado'}</Text>
                    </Box>
                  </HStack>
                </Box>

                {/* Proof */}
                {selectedMiss.proofImage && (
                  <Box>
                    <HStack spacing={2} mb={2}>
                      <Icon as={FiImage} color="gray.500" />
                      <Text fontSize="sm" color="gray.500">Comprovativo</Text>
                    </HStack>
                    <Image 
                      src={resolveBackendUrl(selectedMiss.proofImage) ?? selectedMiss.proofImage}
                      alt="Comprovativo"
                      borderRadius="12px"
                      maxH="300px"
                      w="100%"
                      objectFit="cover"
                      border="1px solid"
                      borderColor="border"
                    />
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DashboardPage;
