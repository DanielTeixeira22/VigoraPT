import { Box, Grid, GridItem, Heading, Select, SimpleGrid, Stack, Text, useColorModeValue } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { completionsByMonth, completionsByWeek, myCompletionsByMonth, myCompletionsByWeek, type CompletionSeriePoint } from '../../services/stats';
import { listCompletion } from '../../services/plans';
import type { ClientProfile, CompletionLog } from '../../types/domain';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import { formatDay } from '../../utils/date';
import { useAuth } from '../../context/AuthContext';
import { listMyClients, getMyClientProfile } from '../../services/clients';
import { getMyTrainerProfile } from '../../services/trainers';

type ClientOption = ClientProfile & { userId?: { username?: string } };

const CompletionChart = ({ data, dataKey }: { data: CompletionSeriePoint[]; dataKey: 'week' | 'month' }) => {
  const tooltipBg = useColorModeValue('#ffffff', '#25253a');
  const tooltipColor = useColorModeValue('#1a202c', '#f7fafc');
  const tooltipBorder = useColorModeValue('#e2e8f0', '#3a3a50');
  
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey={dataKey} />
        <YAxis allowDecimals={false} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: tooltipBg, 
            color: tooltipColor, 
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
          }}
          labelStyle={{ color: tooltipColor }}
        />
        <Bar dataKey="totalCompletions" fill="url(#vigoraGradient)" radius={[8, 8, 4, 4]} />
        <defs>
          <linearGradient id="vigoraGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#33b79e" />
            <stop offset="100%" stopColor="#ffa92e" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>('');

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
    enabled: user?.role !== 'TRAINER' || Boolean(trainerProfile?._id) || Boolean(selectedClient),
  });
  const { data: monthly } = useQuery({
    queryKey: ['stats', 'monthly', selectedClient],
    queryFn: () =>
      selectedClient
        ? completionsByMonth({ clientId: selectedClient })
        : user?.role === 'TRAINER'
          ? completionsByMonth({ trainerId: trainerProfile?._id })
          : myCompletionsByMonth(),
    enabled: user?.role !== 'TRAINER' || Boolean(trainerProfile?._id) || Boolean(selectedClient),
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

  const totalWeekly = useMemo(() => weekly?.reduce((acc, cur) => acc + cur.totalCompletions, 0) ?? 0, [weekly]);
  const totalMonthly = useMemo(() => monthly?.reduce((acc, cur) => acc + cur.totalCompletions, 0) ?? 0, [monthly]);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="KPIs rápidos, evolução semanal/mensal e alertas de treinos falhados."
        extra={
          <Stack direction="row" spacing={3} align="center">
            <Text color="muted">Role atual: {user?.role}</Text>
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

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
        <StatCard label="Total semanal" value={totalWeekly} helper="Treinos concluídos esta semana" />
        <StatCard label="Total mensal" value={totalMonthly} helper="Treinos concluídos este mês" />
        <StatCard
          label="Falhas recentes"
          value={missed?.items?.length ?? 0}
          helper="Últimos registos de falta"
        />
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <Heading size="md" mb={3}>
            Evolução semanal
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            <CompletionChart data={weekly ?? []} dataKey="week" />
          </Box>
        </GridItem>
        <GridItem>
          <Heading size="md" mb={3}>
            Evolução mensal
          </Heading>
          <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
            <CompletionChart data={monthly ?? []} dataKey="month" />
          </Box>
        </GridItem>
      </Grid>

      <Box mt={8} bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4}>
        <Heading size="md" mb={3}>
          Faltas recentes
        </Heading>
        <Stack spacing={3}>
          {(missed?.items ?? []).map((log: CompletionLog) => (
            <Box key={log._id} p={3} border="1px solid" borderColor="border" borderRadius="12px">
              <Text fontWeight={700}>{formatDay(log.date)}</Text>
              <Text fontSize="sm" color="muted">
                Status: {log.status} · Motivo: {log.reason || 'n/d'}
              </Text>
            </Box>
          ))}
          {(missed?.items?.length ?? 0) === 0 && <Text color="muted">Sem faltas registadas.</Text>}
        </Stack>
      </Box>
    </Box>
  );
};

export default DashboardPage;
