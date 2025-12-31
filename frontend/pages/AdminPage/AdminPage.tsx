import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
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
import { FiAward, FiCheck, FiFileText, FiTarget, FiX } from 'react-icons/fi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listTrainers, validateTrainer, rejectTrainer } from '../../services/trainers';
import { adminUpdateUser, searchUsers, toggleUserActive } from '../../services/users';
import { listTrainerChangeRequests, decideTrainerChangeRequest } from '../../services/trainerChange';
import PageHeader from '../../components/ui/PageHeader';
import { resolveBackendUrl } from '../../utils/url';
import type { Role, TrainerChangeRequest, User } from '../../types/domain';

type PopulatedUser = { username?: string; profile?: { firstName?: string; lastName?: string; avatarUrl?: string } };
type UserRef = string | PopulatedUser | undefined | null;

const displayUsername = (val: UserRef) => {
  if (val && typeof val === 'object') {
    if (val.username) return val.username;
    const name = `${val.profile?.firstName ?? ''} ${val.profile?.lastName ?? ''}`.trim();
    if (name) return name;
  }
  return String(val ?? '');
};

// Helper to get user ID (backend returns _id, but type uses id).
const getUserId = (user: User): string => {
  return user._id ?? user.id ?? '';
};

const AdminPage = () => {
  const toast = useToast();
  const qc = useQueryClient();

  const [userFilters, setUserFilters] = useState({ q: '', role: '' });
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
              {(trainers ?? [])
                .filter((t) => t.reviewStatus !== 'REJECTED')
                .map((t) => {
                  const trainerUser = typeof t.userId === 'object' ? (t.userId as PopulatedUser) : null;
                  const trainerName = trainerUser?.profile?.firstName 
                    ? `${trainerUser.profile.firstName} ${trainerUser.profile.lastName ?? ''}`.trim()
                    : trainerUser?.username || 'Trainer';
                  const isValidated = t.reviewStatus === 'APPROVED';
                  
                  return (
                    <Card 
                      key={t._id} 
                      borderRadius="16px" 
                      overflow="hidden"
                      transition="all 0.2s"
                      _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
                      border="1px solid"
                      borderColor={isValidated ? 'green.200' : 'yellow.200'}
                      _dark={{ borderColor: isValidated ? 'green.700' : 'yellow.700' }}
                    >
                      {/* Header com gradiente */}
                      <Box 
                        bgGradient={isValidated 
                          ? 'linear(to-r, green.400, teal.400)' 
                          : 'linear(to-r, yellow.400, orange.400)'
                        }
                        py={4}
                        px={5}
                      >
                        <HStack spacing={3}>
                          <Avatar 
                            size="lg" 
                            name={trainerName}
                            src={resolveBackendUrl(trainerUser?.profile?.avatarUrl) ?? undefined}
                            bg="white"
                            color={isValidated ? 'green.500' : 'yellow.600'}
                          />
                          <Box color="white">
                            <Text fontWeight={700} fontSize="lg">{trainerName}</Text>
                            <Badge 
                              colorScheme={isValidated ? 'green' : 'yellow'} 
                              variant="solid"
                              borderRadius="full"
                              px={2}
                            >
                              {isValidated ? '✓ Validado' : '⏳ Pendente'}
                            </Badge>
                          </Box>
                        </HStack>
                      </Box>
                      
                      <CardBody pt={4}>
                        <Stack spacing={3}>
                          {/* Certificação */}
                          <HStack>
                            <Icon as={FiAward} color="brand.500" />
                            <Box>
                              <Text fontSize="xs" color="gray.500">Certificação</Text>
                              <Text fontWeight={600} fontSize="sm">{t.certification || 'Não especificada'}</Text>
                            </Box>
                          </HStack>
                          
                          {/* Especialidades */}
                          <HStack align="start">
                            <Icon as={FiTarget} color="brand.500" mt={1} />
                            <Box>
                              <Text fontSize="xs" color="gray.500">Especialidades</Text>
                              <HStack flexWrap="wrap" gap={1} mt={1}>
                                {t.specialties.length > 0 ? t.specialties.map((spec) => (
                                  <Badge key={spec} size="sm" colorScheme="brand" variant="subtle" borderRadius="full">
                                    {spec}
                                  </Badge>
                                )) : <Text fontSize="sm" color="muted">—</Text>}
                              </HStack>
                            </Box>
                          </HStack>
                          
                          {/* Preço */}
                          <HStack>
                            <Text fontSize="lg" fontWeight="bold" color="brand.500">€</Text>
                            <Box>
                              <Text fontSize="xs" color="gray.500">Preço/hora</Text>
                              <Text fontWeight={700} fontSize="lg" color="brand.500">
                                {typeof t.hourlyRate === 'number' ? `${t.hourlyRate}€` : '—'}
                              </Text>
                            </Box>
                          </HStack>
                          
                          {/* Documentos */}
                          {(t.documentUrls?.length ?? 0) > 0 && (
                            <Box>
                              <HStack mb={1}>
                                <Icon as={FiFileText} color="gray.500" />
                                <Text fontSize="xs" color="gray.500">Documentos</Text>
                              </HStack>
                              <Stack spacing={1}>
                                {(t.documentUrls ?? []).map((url, idx) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer">
                                    <Text fontSize="xs" color="brand.500" _hover={{ textDecoration: 'underline' }}>
                                      📄 Documento {idx + 1}
                                    </Text>
                                  </a>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Stack>

                        {/* Botões de ação */}
                        {!t.validatedByAdmin && (
                          <HStack mt={4} spacing={2}>
                            <Button 
                              size="sm" 
                              colorScheme="green"
                              flex={1}
                              onClick={() => validateMutation.mutate(t._id!)} 
                              isLoading={validateMutation.isPending}
                              leftIcon={<Icon as={FiCheck} />}
                            >
                              Validar
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              flex={1}
                              onClick={() => rejectMutation.mutate(t._id!)}
                              isLoading={rejectMutation.isPending}
                              leftIcon={<Icon as={FiX} />}
                            >
                              Rejeitar
                            </Button>
                          </HStack>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
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
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
              {mappedUsers.map((u: User) => {
                const uid = getUserId(u);
                const userName = u.profile?.firstName 
                  ? `${u.profile.firstName} ${u.profile.lastName ?? ''}`.trim()
                  : u.username;
                const roleColor = u.role === 'ADMIN' ? 'purple' : u.role === 'TRAINER' ? 'green' : 'blue';
                
                return (
                  <Card 
                    key={uid}
                    borderRadius="16px"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl', borderColor: 'brand.300' }}
                    border="1px solid"
                    borderColor="border"
                    onClick={() => setSelectedUser(u)}
                  >
                    <CardBody p={4} textAlign="center">
                      <Avatar 
                        size="lg" 
                        name={userName}
                        src={resolveBackendUrl(u.profile?.avatarUrl) ?? undefined}
                        mb={3}
                        mx="auto"
                      />
                      <Text fontWeight={700} fontSize="md" noOfLines={1}>{userName}</Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>{u.email}</Text>
                      <Badge mt={2} colorScheme={roleColor} borderRadius="full" px={2}>
                        {u.role}
                      </Badge>
                      {!u.isActive && (
                        <Badge ml={2} colorScheme="red" borderRadius="full" px={2}>
                          Inativo
                        </Badge>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
              {(mappedUsers.length ?? 0) === 0 && <Text color="muted">Nenhum utilizador encontrado.</Text>}
            </SimpleGrid>

            {/* Modal de Gestão de Utilizador */}
            <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} size="md" isCentered>
              <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
              <ModalContent borderRadius="16px" mx={4}>
                <ModalHeader pb={2}>
                  <HStack spacing={3}>
                    <Avatar 
                      size="md" 
                      name={selectedUser?.profile?.firstName 
                        ? `${selectedUser.profile.firstName} ${selectedUser.profile.lastName ?? ''}`.trim()
                        : selectedUser?.username
                      }
                      src={resolveBackendUrl(selectedUser?.profile?.avatarUrl) ?? undefined}
                    />
                    <Box>
                      <Text fontWeight={700}>
                        {selectedUser?.profile?.firstName 
                          ? `${selectedUser.profile.firstName} ${selectedUser.profile.lastName ?? ''}`.trim()
                          : selectedUser?.username
                        }
                      </Text>
                      <Text fontSize="sm" color="gray.500">{selectedUser?.email}</Text>
                    </Box>
                  </HStack>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                  {selectedUser && (
                    <Stack spacing={4}>
                      {/* Status atual */}
                      <HStack justify="space-between" p={3} bg="gray.50" _dark={{ bg: 'gray.800' }} borderRadius="12px">
                        <Text fontSize="sm" fontWeight={600}>Estado</Text>
                        <Badge colorScheme={selectedUser.isActive ? 'green' : 'red'} borderRadius="full">
                          {selectedUser.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </HStack>

                      {/* Alterar Role */}
                      <Box p={3} bg="gray.50" _dark={{ bg: 'gray.800' }} borderRadius="12px">
                        <Text fontSize="sm" fontWeight={600} mb={2}>Alterar Role</Text>
                        <HStack>
                          <Select
                            size="sm"
                            value={userRoleDrafts[getUserId(selectedUser)] ?? selectedUser.role}
                            onChange={(e) =>
                              setUserRoleDrafts({
                                ...userRoleDrafts,
                                [getUserId(selectedUser)]: e.target.value as Role,
                              })
                            }
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="TRAINER">Trainer</option>
                            <option value="CLIENT">Cliente</option>
                          </Select>
                          <Button
                            size="sm"
                            colorScheme="brand"
                            onClick={() => {
                              const uid = getUserId(selectedUser);
                              updateUserMutation.mutate({ id: uid, role: userRoleDrafts[uid] ?? selectedUser.role });
                              setSelectedUser(null);
                            }}
                            isDisabled={!userRoleDrafts[getUserId(selectedUser)]}
                            isLoading={updateUserMutation.isPending}
                          >
                            Guardar
                          </Button>
                        </HStack>
                      </Box>

                      {/* Ações */}
                      <Button
                        colorScheme={selectedUser.isActive ? 'red' : 'green'}
                        variant="outline"
                        onClick={() => {
                          toggleActiveMutation.mutate(getUserId(selectedUser));
                          setSelectedUser(null);
                        }}
                        isLoading={toggleActiveMutation.isPending}
                      >
                        {selectedUser.isActive ? 'Desativar Utilizador' : 'Ativar Utilizador'}
                      </Button>
                    </Stack>
                  )}
                </ModalBody>
              </ModalContent>
            </Modal>
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
