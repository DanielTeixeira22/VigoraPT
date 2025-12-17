import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Grid,
  GridItem,
  HStack,
  Input,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listPublicTrainers } from '../../services/trainers';
import PageHeader from '../../components/ui/PageHeader';
import type { TrainerProfile } from '../../types/domain';

const renderTrainerName = (t: TrainerProfile) => {
  const user = t.userId as unknown;
  if (user && typeof user === 'object' && 'username' in user) {
    return (user as { username?: string }).username || 'Trainer';
  }
  return typeof t.userId === 'string' ? t.userId : 'Trainer';
};

const TrainerDirectoryPage = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest'>('newest');
  const [page, setPage] = useState(1);
  const limit = 9;

  const { data, isFetching } = useQuery({
    queryKey: ['trainers', 'public', search, sort, page],
    queryFn: () => listPublicTrainers({ q: search || undefined, sort, page, limit }),
    keepPreviousData: true,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const list = items;
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((t) => (t.specialties ?? []).some((s) => s.toLowerCase().includes(term)) || t.certification?.toLowerCase().includes(term));
  }, [items, search]);

  return (
    <Box>
      <PageHeader
        title="Treinadores"
        subtitle="Pesquisa simples, sort e listagem pública de personal trainers validados."
        extra={
          <HStack>
            <Input placeholder="Pesquisar por especialidade" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={sort} onChange={(e) => setSort(e.target.value as 'rating' | 'newest')} w="160px">
              <option value="newest">Mais recentes</option>
              <option value="rating">Melhor rating</option>
            </Select>
            <HStack>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={page === 1 || isFetching}>
                Anterior
              </Button>
              <Text fontSize="sm">
                Página {page}/{data?.pages ?? 1}
              </Text>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => (data?.pages && p < data.pages ? p + 1 : p))}
                isDisabled={isFetching || !data?.pages || page >= (data?.pages ?? 1)}
              >
                Seguinte
              </Button>
            </HStack>
          </HStack>
        }
      />

      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
        {filtered.map((t: TrainerProfile) => (
          <GridItem key={t._id}>
            <Card>
              <CardBody>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight={700}>Trainer {renderTrainerName(t)}</Text>
                  <Badge colorScheme={t.validatedByAdmin ? 'green' : 'yellow'}>
                    {t.validatedByAdmin ? 'Validado' : 'Por validar'}
                  </Badge>
                </Flex>
                <Text fontSize="sm" color="muted">
                  Certificação: {t.certification || 'n/d'}
                </Text>
                <Stack direction="row" spacing={2} mt={3} wrap="wrap">
                  {(t.specialties ?? []).map((s) => (
                    <Badge key={s} colorScheme="brand" variant="subtle">
                      {s}
                    </Badge>
                  ))}
                  {(t.specialties?.length ?? 0) === 0 && <Text color="muted">Sem especialidades indicadas.</Text>}
                </Stack>
                <Text fontSize="sm" color="muted" mt={2}>
                  Preço hora: {t.hourlyRate ? `${t.hourlyRate}€` : 'n/d'}
                </Text>
              </CardBody>
            </Card>
          </GridItem>
        ))}
        {(filtered.length ?? 0) === 0 && <Text color="muted">Nenhum treinador encontrado.</Text>}
      </Grid>
    </Box>
  );
};

export default TrainerDirectoryPage;
