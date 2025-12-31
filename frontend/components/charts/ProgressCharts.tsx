import { Box, Text, Flex, Spinner, HStack, Badge } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { listBodyMetrics, BodyMetric } from '../../services/bodyMetrics';

interface ProgressChartsProps {
  limit?: number;
}

// Progress charts for weight and muscle mass.
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};

const ProgressCharts = ({ limit = 20 }: ProgressChartsProps) => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['body-metrics', 'history', limit],
    queryFn: () => listBodyMetrics(limit),
  });

  if (isLoading) {
    return (
      <Flex justify="center" align="center" py={8}>
        <Spinner color="brand.500" />
      </Flex>
    );
  }

  if (error || !metrics || metrics.length === 0) {
    return (
      <Box 
        p={6} 
        textAlign="center" 
        bg="gray.50" 
        _dark={{ bg: 'gray.700' }} 
        borderRadius="12px"
      >
        <Text fontSize="3xl" mb={2}>📊</Text>
        <Text fontWeight={600} mb={1}>Sem dados de progresso</Text>
        <Text fontSize="sm" color="gray.500">
          As tuas métricas irão aparecer aqui após registares peso ou massa muscular.
        </Text>
      </Box>
    );
  }

  // Sort by date (ascending) for chart consistency.
  const chartData = [...metrics]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((m: BodyMetric) => ({
      date: formatDate(m.recordedAt),
      weight: m.weight ?? null,
      muscleMass: m.muscleMass ?? null,
      fullDate: new Date(m.recordedAt).toLocaleDateString('pt-PT'),
    }));

  // Get the latest values for highlights.
  const latestWeight = metrics.find(m => m.weight)?.weight;
  const latestMuscleMass = metrics.find(m => m.muscleMass)?.muscleMass;

  return (
    <Box>
      {/* Current stats */}
      <HStack spacing={4} mb={4} wrap="wrap">
        {latestWeight && (
          <Badge 
            colorScheme="blue" 
            px={3} 
            py={2} 
            borderRadius="full"
            fontSize="sm"
          >
            ⚖️ Peso atual: {latestWeight.toFixed(1)} kg
          </Badge>
        )}
        {latestMuscleMass && (
          <Badge 
            colorScheme="purple" 
            px={3} 
            py={2} 
            borderRadius="full"
            fontSize="sm"
          >
            💪 Massa muscular: {latestMuscleMass.toFixed(1)}%
          </Badge>
        )}
      </HStack>

      {/* Weight chart */}
      {chartData.some(d => d.weight !== null) && (
        <Box 
          mb={6} 
          p={4} 
          bg="white" 
          _dark={{ bg: 'gray.800', borderColor: 'gray.600' }} 
          borderRadius="12px"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight={600} mb={3} fontSize="sm">⚖️ Evolução do Peso (kg)</Text>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                stroke="#A0AEC0"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                stroke="#A0AEC0"
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value?.toFixed(1)} kg`, 'Peso']}
                labelFormatter={(label: string) => `Data: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3182CE" 
                strokeWidth={2}
                dot={{ fill: '#3182CE', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Muscle mass chart */}
      {chartData.some(d => d.muscleMass !== null) && (
        <Box 
          p={4} 
          bg="white" 
          _dark={{ bg: 'gray.800', borderColor: 'gray.600' }} 
          borderRadius="12px"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight={600} mb={3} fontSize="sm">💪 Evolução da Massa Muscular (%)</Text>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                stroke="#A0AEC0"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                stroke="#A0AEC0"
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value?.toFixed(1)}%`, 'Massa Muscular']}
                labelFormatter={(label: string) => `Data: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="muscleMass" 
                stroke="#805AD5" 
                strokeWidth={2}
                dot={{ fill: '#805AD5', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default ProgressCharts;
