import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listTrainers, validateTrainer, rejectTrainer } from '../../services/trainers';
import { adminUpdateUser, searchUsers, toggleUserActive } from '../../services/users';
import { listTrainerChangeRequests, decideTrainerChangeRequest } from '../../services/trainerChange';
import PageHeader from '../../components/ui/PageHeader';
import type { Role, TrainerChangeRequest, User } from '../../types/domain';

type PopulatedUser = { username?: string; profile?: { firstName?: string; lastName?: string } };
type UserRef = string | PopulatedUser | undefined | null;

const displayUsername = (val: UserRef) => {
  if (val && typeof val === 'object') {
    if (val.username) return val.username;
    const name = `${val.profile?.firstName ?? ''} ${val.profile?.lastName ?? ''}`.trim();
    if (name) return name;
  }
  return String(val ?? '');
};

// Helper para obter o ID do utilizador (backend retorna _id, mas tipo usa id)
const getUserId = (user: User): string => {
  return user._id ?? user.id ?? '';
};

const AdminPage = () => {
  const toast = useToast();
  const qc = useQueryClient();

  const [userFilters, setUserFilters] = useState({ q: '', role: '' });
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>({});

  const { data: trainers } = useQuery({
    queryKey: ['trainers', 'admin'],
    queryFn: () => listTrainers(),
  });

  const { data: users } = useQuery({
    queryKey: ['users', userFilters],
    queryFn: () => searchUsers({ q: userFilters.q, role: userFilters.role as Role }),
  });

  const { data: trainerChange } = useQuery({
    queryKey: ['trainer-change'],
    queryFn: () => listTrainerChangeRequests(),
  });

  const validateMutation = useMutation({
    mutationFn: validateTrainer,
    onSuccess: () => {
      toast({ title: 'Trainer validado', status: 'success' });
      qc.invalidateQueries({ queryKey: ['trainers', 'admin'] });
    },
    onError: () => toast({ title: 'Erro ao validar', status: 'error' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => {
      toast({ title: 'Estado atualizado', status: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminUpdateUser(id, { role }),
    onSuccess: (_data, variables) => {
      toast({ title: 'Utilizador atualizado', status: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setUserRoleDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectTrainer,
    onSuccess: () => {
      toast({ title: 'Pedido de personal trainer rejeitado com sucesso.', status: 'info' });
      qc.invalidateQueries({ queryKey: ['trainers', 'admin'] });
    },
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => decideTrainerChangeRequest(id, status),
    onSuccess: (_data, variables) => {
      toast({ title: 'Pedido atualizado', status: 'success' });
      qc.invalidateQueries({ queryKey: ['trainer-change'] });
      // If approved, also invalidate clients lists so trainers see the updated client list
      if (variables.status === 'APPROVED') {
        qc.invalidateQueries({ queryKey: ['clients'] });
      }
    },
  });

  const mappedUsers = useMemo(() => users?.data ?? [], [users]);

  return (
    <Box>
      <PageHeader title="Administração" subtitle="Validar trainers, gerir utilizadores e pedidos de mudança." />

      <Tabs colorScheme="brand">
        <TabList>
          <Tab>Personal Trainers</Tab>
          <Tab>Utilizadores / Clientes</Tab>
          <Tab>Pedidos de alteração</Tab>
        </TabList>
        <TabPanels mt={4}>
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {(trainers ?? [])
                .filter((t) => t.reviewStatus !== 'REJECTED')
                .map((t) => (
                <Card key={t._id}>
                  <CardBody>
                    <Text fontWeight={700}>
                      Trainer {typeof t.userId === 'object' ? (t.userId as PopulatedUser)?.username ?? '' : t.userId}
                    </Text>
                    <Stack spacing={2} mt={3}>
                      <Text fontSize="sm" color="muted">
                        Certificação: {t.certification || 'n/d'}
                      </Text>
                      <Text fontSize="sm" color="muted">
                        Especialidades: {t.specialties.join(', ') || 'n/d'}
                      </Text>
                      <Text fontSize="sm" color="muted">
                        Preço hora: {typeof t.hourlyRate === 'number' ? `${t.hourlyRate}€` : 'n/d'}
                      </Text>
                      <Stack spacing={1}>
                        <Text fontSize="sm" fontWeight={600}>
                          Documentos:
                        </Text>
                        {(t.documentUrls ?? []).map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <Text fontSize="xs" color="brand.500">
                              {url}
                            </Text>
                          </a>
                        ))}
                        {(t.documentUrls?.length ?? 0) === 0 && <Text fontSize="xs">Sem documentos enviados.</Text>}
                      </Stack>
                    </Stack>

                    <HStack mt={3} justify="space-between">
                      <Badge colorScheme={t.reviewStatus === 'APPROVED' ? 'green' : t.reviewStatus === 'REJECTED' ? 'red' : 'yellow'}>
                        {t.reviewStatus === 'APPROVED' ? 'Validado' : t.reviewStatus === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                      </Badge>
                      <HStack>
                        {!t.validatedByAdmin && (
                          <>
                            <Button size="sm" onClick={() => validateMutation.mutate(t._id!)} isLoading={validateMutation.isPending}>
                              Validar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(t._id!)}
                              isLoading={rejectMutation.isPending}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <HStack mb={4} spacing={3}>
              <Input placeholder="Pesquisar" value={userFilters.q} onChange={(e) => setUserFilters({ ...userFilters, q: e.target.value })} />
              <Select
                placeholder="Role"
                value={userFilters.role}
                onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                w="160px"
              >
                <option value="ADMIN">Admin</option>
                <option value="TRAINER">Trainer</option>
                <option value="CLIENT">Cliente</option>
              </Select>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {mappedUsers.map((u: User) => {
                const uid = getUserId(u);
                return (
                <Card key={uid}>
                  <CardBody>
                    <Text fontWeight={700}>{u.username}</Text>
                    <Text fontSize="sm" color="muted">
                      {u.email}
                    </Text>
                    <HStack mt={2} justify="space-between">
                      <Badge>{u.role}</Badge>
                      <HStack>
                        <Button size="xs" variant="outline" onClick={() => toggleActiveMutation.mutate(uid)}>
                          {u.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Select
                          size="xs"
                          w="120px"
                          value={userRoleDrafts[uid] ?? u.role}
                          onChange={(e) =>
                            setUserRoleDrafts({
                              ...userRoleDrafts,
                              [uid]: e.target.value as Role,
                            })
                          }
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="TRAINER">Trainer</option>
                          <option value="CLIENT">Cliente</option>
                        </Select>
                        <Button
                          size="xs"
                          onClick={() => uid && updateUserMutation.mutate({ id: uid, role: userRoleDrafts[uid] ?? u.role })}
                          isDisabled={!userRoleDrafts[uid] || !uid}
                        >
                          Guardar
                        </Button>
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>
              );
              })}
              {(mappedUsers.length ?? 0) === 0 && <Text color="muted">Nenhum utilizador encontrado.</Text>}
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {(trainerChange ?? [])
                .filter((req) => req.status === 'PENDING')
                .map((req: TrainerChangeRequest) => (
                <Card key={req._id}>
                  <CardBody>
                    <Text fontWeight={700}>Pedido</Text>
                    <Text fontSize="sm" color="muted">
                      Cliente: {displayUsername((req.clientId as { userId?: PopulatedUser | string })?.userId || req.clientId)}
                    </Text>
                    <Text fontSize="sm" color="muted">
                      Atual:{' '}
                      {displayUsername((req.currentTrainerId as { userId?: PopulatedUser | string })?.userId || req.currentTrainerId) || 'n/d'} → Novo:{' '}
                      {displayUsername((req.requestedTrainerId as { userId?: PopulatedUser | string })?.userId || req.requestedTrainerId)}
                    </Text>
                    <Text fontSize="sm" color="muted">
                      Motivo: {req.reason || 'n/d'}
                    </Text>
                    <HStack mt={3} spacing={2}>
                      <Button size="sm" onClick={() => decideMutation.mutate({ id: req._id!, status: 'APPROVED' })}>
                        Aprovar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ id: req._id!, status: 'REJECTED' })}>
                        Rejeitar
                      </Button>
                      <Badge>{req.status}</Badge>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
              {(trainerChange?.filter((r) => r.status === 'PENDING').length ?? 0) === 0 && (
                <Text color="muted">Sem pedidos pendentes.</Text>
              )}
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default AdminPage;
