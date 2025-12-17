import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listMyClients, trainerCreateClient } from '../../services/clients';
import { sendAlert } from '../../services/notifications';
import PageHeader from '../../components/ui/PageHeader';
import type { ClientProfile, User } from '../../types/domain';

type ClientWithUser = ClientProfile & { userId?: User };

const MyClientsPage = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    goals: '',
  });
  const [alerts, setAlerts] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ['clients', 'my'],
    queryFn: listMyClients,
  });

  const mutation = useMutation({
    mutationFn: trainerCreateClient,
    onSuccess: () => {
      toast({ title: 'Cliente criado', status: 'success' });
      qc.invalidateQueries({ queryKey: ['clients', 'my'] });
      setForm({ username: '', email: '', password: '', firstName: '', lastName: '', goals: '' });
    },
    onError: () => toast({ title: 'Erro ao criar cliente', status: 'error' }),
  });

  const alertMutation = useMutation({
    mutationFn: sendAlert,
    onSuccess: () => toast({ title: 'Alerta enviado', status: 'success' }),
    onError: () => toast({ title: 'Falha ao enviar alerta', status: 'error' }),
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (data ?? []).filter((c: ClientWithUser) => {
      const u = c.userId;
      return (
        (u?.username ?? '').toLowerCase().includes(term) ||
        (u?.email ?? '').toLowerCase().includes(term) ||
        (u?.profile?.firstName ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, search]);

  return (
    <Box>
      <PageHeader
        title="Clientes"
        subtitle="Listagem, pesquisa simples e criação de clientes associada ao treinador."
        extra={<Input placeholder="Pesquisar clientes" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {filtered.map((c: ClientWithUser) => (
              <Card key={c._id}>
                <CardBody>
                  <Text fontWeight={700}>{c.userId?.username ?? c._id}</Text>
                  <Text fontSize="sm" color="muted">
                    {c.userId?.email}
                  </Text>
                  <Text fontSize="sm" color="muted">
                    Objetivos: {c.goals || 'n/d'}
                  </Text>
                  <Stack mt={3} spacing={2}>
                    <Input
                      size="sm"
                      placeholder="Mensagem rápida"
                      value={alerts[c._id] ?? ''}
                      onChange={(e) => setAlerts({ ...alerts, [c._id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alertMutation.mutate({ clientId: c._id, message: alerts[c._id] })}
                      isLoading={alertMutation.isPending}
                    >
                      Enviar alerta
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            ))}
            {(filtered.length ?? 0) === 0 && <Text color="muted">Sem clientes ainda.</Text>}
          </SimpleGrid>
        </GridItem>
        <GridItem>
          <Card>
            <CardBody>
              <Text fontWeight={700} mb={3}>
                Adicionar cliente
              </Text>
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel>Username</FormLabel>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Primeiro nome</FormLabel>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Apelido</FormLabel>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Objetivos</FormLabel>
                  <Input value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
                </FormControl>
                <Button onClick={() => mutation.mutate(form)} isLoading={mutation.isPending}>
                  Criar cliente
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default MyClientsPage;
